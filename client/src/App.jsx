const express = require("express");
const moment = require("moment");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const fs = require("fs");
const { randomUUID } = require("crypto");
const sharp = require("sharp");
const cors = require("cors");
const querystring = require('querystring'); // Keep this for devicecmd parsing

// Initialize Express app
const app = express();
let logger = console.log; // Use a more robust logger in production

const corsOptions = {
  origin: "*", // Allow all origins (Consider restricting in production)
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};
app.use(cors(corsOptions));

// --- Database Setup ---
// NOTE: Using the original schema as requested, including 'userpin' in KeyValueStore
const dbPath = path.join(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    initializeDatabase(); // Call initialization function
  }
});

// Function to initialize database tables if they don't exist
function initializeDatabase() {
    db.serialize(() => { // Use serialize to ensure sequential execution
        db.run(`
          CREATE TABLE IF NOT EXISTS KeyValueStore (
            key TEXT PRIMARY KEY,
            value TEXT,
            userpin integer, -- Keeping this column as requested
            date_created TEXT DEFAULT (datetime('now'))
          )
        `, (err) => {
            if (err) console.error("Error creating KeyValueStore table:", err.message);
            else console.log("KeyValueStore table checked/created.");
        });

        db.run(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userPin TEXT UNIQUE NOT NULL, -- Changed to userPin for consistency
            name TEXT NOT NULL,
            email TEXT UNIQUE, -- Allow NULL emails potentially
            photo TEXT -- Base64 or path reference
          );`,
          (err) => {
            if (err) console.error("Error creating users table:", err.message);
            else console.log("users table checked/created.");
          }
        );

        // Create commands log table (useful for tracking)
        db.run(
          `CREATE TABLE IF NOT EXISTS commands_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            command TEXT NOT NULL,
            command_uuid TEXT UNIQUE NOT NULL, -- Made UUID unique and not null
            status TEXT DEFAULT 'pending', -- pending, sent, executed, failed
            device_sn TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sent_at DATETIME,
            executed_at DATETIME
          );`,
          (err) => {
            if (err) console.error("Error creating commands_log table:", err.message);
             else console.log("commands_log table checked/created.");
          }
        );

        // Create Devices table (useful for tracking)
        db.run(
          `CREATE TABLE IF NOT EXISTS Devices (
            sn TEXT PRIMARY KEY, -- Changed to TEXT and PRIMARY KEY
            last_seen DATETIME,
            ip_address TEXT,
            firmware_version TEXT
            -- Removed columns from original schema that seemed incorrect for Devices table
          );`,
          (err) => {
            if (err) console.error("Error creating Devices table:", err.message);
             else console.log("Devices table checked/created.");
          }
        );
    });
}


// --- KeyValueStore Functions ---
// Keeping the original function signature with userpin
function setKeyValue(key, value, userpin = null) { // Default userpin to null
  const serializedValue = JSON.stringify(value); // Convert value to JSON string
  return new Promise((resolve, reject) => {
    db.run(
      // Using original INSERT/UPDATE logic
      `INSERT INTO KeyValueStore (key, value, userpin, date_created) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, userpin = excluded.userpin, date_created = datetime('now')`,
      [key, serializedValue, userpin], // Pass userpin
      function (err) {
        if (err) {
            console.error(`Error in setKeyValue for key "${key}":`, err.message);
            reject(err);
        } else {
            resolve("Key-Value pair set successfully.");
        }
      }
    );
  });
}

function getValueByKey(key) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT value FROM KeyValueStore WHERE key = ?`,
      [key],
      (err, row) => {
        if (err) {
            console.error(`Error in getValueByKey for key "${key}":`, err.message);
            reject(err);
        } else {
            try {
                resolve(row ? JSON.parse(row.value) : null); // Convert back from JSON
            } catch (parseError) {
                console.error(`Error parsing JSON for key "${key}":`, parseError.message, "Raw value:", row ? row.value : 'N/A');
                resolve(null); // Return null if parsing fails
            }
        }
      }
    );
  });
}

// Keeping this function as it was in the original code
function getValueByUserpin(userpin) {
  logger(`getValueByUserpin called: userpin=${userpin}`); // Debug log
  return new Promise((resolve, reject) => {
    // This query might return device state if setKeyValue was called with a userpin for an SN key
    db.get(
      `SELECT * FROM KeyValueStore WHERE userpin = ?`,
      [userpin],
      (err, row) => {
        if (err) {
            console.error(`Error in getValueByUserpin for userpin "${userpin}":`, err.message);
            reject(err);
        } else {
            try {
                logger(`Row found for userpin "${userpin}":`, row); // Debug log
                resolve(row ? JSON.parse(row.value) : null);
            } catch (parseError) {
                 console.error(`Error parsing JSON for userpin "${userpin}":`, parseError.message, "Row:", row);
                 resolve(null); // Return null if parsing fails
            }
        }
      }
    );
  });
}

// --- File Upload Setup ---
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage: storage });

// --- Middleware ---
app.use(express.json({ limit: '10mb' })); // Parses application/json
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parses application/x-www-form-urlencoded
app.use('/uploads', express.static(uploadDir)); // Optional: serve uploaded files

// --- Helper Functions ---
function convertToGMT(date) {
  let d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    console.error("Invalid date input to convertToGMT:", date);
    d = new Date(); // Use current time as fallback
  }
  return d.toUTCString();
}

// Function to delete old records from KeyValueStore (excluding 'commands' key)
function deleteOldKeyValueRecords(days = 7) { // Keep 7 days by default
  const cutoffDate = moment().subtract(days, 'days').toISOString();
  db.run(
    `DELETE FROM KeyValueStore WHERE date_created < ? AND key != ?`,
    [cutoffDate, 'commands'], // Exclude the global commands key
    function (err) {
      if (err) {
        console.error("Error deleting old KeyValueStore records:", err.message);
      } else if (this.changes > 0) {
        // console.log(`${this.changes} old KeyValueStore records deleted (older than ${days} days).`); // Less verbose logging
      }
    }
  );
}

// --- ZKTeco Device Interaction Endpoints ---

// GET /iclock/cdata?SN=<serial>
// Device initial check-in. No longer manages device state here.
app.get("/iclock/cdata", async (req, res) => {
  const now = new Date();
  deleteOldKeyValueRecords(); // Periodically clean up old records

  try {
    const { SN } = req.query;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!SN || typeof SN !== "string") {
      logger(`[${SN || 'Unknown'}] Invalid GET /iclock/cdata: SN missing or invalid.`);
      return res.status(400).send("ERROR: SN is required.\n");
    }

    logger(`[${SN}] GET /iclock/cdata request received from ${ipAddress}`);

    // First check if device exists
    const deviceExists = await new Promise((resolve, reject) => {
      db.get(`SELECT sn FROM Devices WHERE sn = ?`, [SN], (err, row) => {
        if (err) {
          console.error(`[${SN}] Error checking device existence:`, err.message);
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });

    logger(`[${SN}] Device exists check: ${deviceExists ? 'Yes' : 'No'}`);

    // Update device last seen time in Devices table
    db.run(
        `INSERT INTO Devices (sn, last_seen, ip_address) VALUES (?, datetime('now'), ?)
         ON CONFLICT(sn) DO UPDATE SET last_seen = datetime('now'), ip_address = excluded.ip_address`,
        [SN, ipAddress],
        async function(err) {
            if (err) {
              console.error(`[${SN}] Error updating device last seen:`, err.message);
            } else {
              // If device is new (not previously registered)
              if (!deviceExists) {
                logger(`[${SN}] This is a NEW device joining the network. Syncing all users...`);
                try {
                  // Get all existing users
                  const users = await new Promise((resolve, reject) => {
                    db.all(`SELECT userPin, name, photo FROM users ORDER BY userPin`, [], (err, rows) => {
                      if (err) reject(err);
                      else resolve(rows);
                    });
                  });

                  if (users && users.length > 0) {
                    logger(`[${SN}] New device detected. Queueing ${users.length} users for sync.`);
                    const commandStrings = [];
                    const batchId = randomUUID().substring(0, 8);
                    
                    // Create a command for each user
                    users.forEach((user, index) => {
                      const cmdSeq = String(index + 1).padStart(2, '0');
                      const sanitizedName = user.name.replace(/[\t\n\r]/g, ' ');
                      
                      // Add user data command
                      commandStrings.push(`C:${batchId}${cmdSeq}:DATA USER PIN=${user.userPin}\tName=${sanitizedName}\tPri=0`);
                      
                      // Add photo if available
                      if (user.photo) {
                        try {
                          const photoBuffer = Buffer.from(user.photo, 'base64');
                          const photoSize = photoBuffer.length;
                          const photoSeq = String(index + 1).padStart(2, '0') + 'p'; // Add 'p' suffix for photo commands
                          commandStrings.push(`C:${batchId}${photoSeq}:DATA UPDATE BIOPHOTO PIN=${user.userPin}\tFID=1\tNo=0\tIndex=0\tType=2\tFormat=0\tSize=${photoSize}\tContent=${user.photo}`);
                        } catch (photoErr) {
                          console.error(`[${SN}] Error preparing photo for user ${user.userPin}:`, photoErr.message);
                          // Continue without photo if there's an error
                        }
                      }
                    });
                    
                    // Queue all commands for this new device
                    if (commandStrings.length > 0) {
                      logger(`[${SN}] Prepared ${commandStrings.length} sync commands, adding to queue...`);
                      const addedCommands = await addCommandsToQueue(commandStrings);
                      logger(`[${SN}] Successfully queued ${addedCommands ? addedCommands.length : 0} user sync commands for new device.`);
                    }
                  } else {
                    logger(`[${SN}] No users found to sync with new device.`);
                  }
                } catch (syncError) {
                  console.error(`[${SN}] Error queueing user sync for new device:`, syncError);
                  // Continue with normal response even if sync queueing fails
                }
              }
            }
        }
    );

    // Standard ZKTeco response body
    const body = `GET OPTION FROM:${SN}\nATTLOGStamp=None\nOPERLOGStamp=9999\nATTPHOTOStamp=None\nErrorDelay=30\nDelay=10\nTransTimes=00:00;14:05\nTransInterval=1\nTransFlag=TransData AttLog OpLog AttPhoto EnrollUser ChgUser EnrollFP ChgFP UserPic\nTimeZone=8\nRealtime=1\nEncrypt=0`;
    const contentLength = Buffer.byteLength(body, "utf-8");

    // Set response headers
    res.set({
      "Content-Type": "text/plain",
      "Content-Length": contentLength,
      "Pragma": "no-cache",
      "Connection": "close",
      "Cache-Control": "no-store",
      "Date": convertToGMT(now),
      "Server": "ZKTeco Server",
    });

    logger(`[${SN}] Sending cdata options response.`);
    return res.status(200).send(body);

  } catch (error) {
    const sn = req.query.SN || 'Unknown';
    logger(`[${sn}] Error in GET /iclock/cdata:`, error);
    return res.status(500).send("ERROR: Internal Server Error.\n");
  }
});

// GET /iclock/getrequest?SN=<serial>
// Device polls for commands. Uses commands_log for state tracking.
app.get("/iclock/getrequest", async (req, res) => {
  const { SN } = req.query;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!SN) {
    logger(`[Unknown] Invalid getrequest: SN missing.`);
    return res.status(400).send("ERROR: SN required.\n");
  }

  logger(`[${SN}] GET /iclock/getrequest received from ${ipAddress}`);

  let commandToSend = null;
  let commandUUID = null;

  try {
    // 1. Get the global command list (array of objects: {uuid, command})
    // This list remains in KeyValueStore for simplicity of adding commands.
    const globalCommandObjects = await getValueByKey("commands") || [];

    // 2. Get command UUIDs already processed (sent or executed) by *this specific device* from commands_log
    const processedCommandUUIDs = await new Promise((resolve, reject) => {
        db.all(
            // Select UUIDs that have been sent to or executed by this device
            // Including 'sent' prevents resending if devicecmd fails but the command was delivered
            `SELECT command_uuid FROM commands_log WHERE device_sn = ? AND status IN ('sent', 'executed')`,
            [SN],
            (err, rows) => {
                if (err) {
                    console.error(`[${SN}] Error querying commands_log for processed commands:`, err.message);
                    reject(err); // Reject the promise on DB error
                } else {
                    // Extract just the UUIDs into an array
                    resolve(rows.map(row => row.command_uuid));
                }
            }
        );
    });

    const processedSet = new Set(processedCommandUUIDs); // Use Set for efficient O(1) lookup
    // logger(`[${SN}] Device has already processed ${processedSet.size} command UUIDs.`); // Verbose log

    // 3. Find the next command for this device from the global list
    if (Array.isArray(globalCommandObjects) && globalCommandObjects.length > 0) {
      for (const cmdObj of globalCommandObjects) {
        // Check if the command object is valid and its UUID hasn't been processed by this device
        if (cmdObj && cmdObj.uuid && !processedSet.has(cmdObj.uuid)) {
          commandToSend = cmdObj.command; // Get the command string to send
          commandUUID = cmdObj.uuid;     // Get the UUID to track execution

          logger(`[${SN}] Found command to send (UUID: ${commandUUID}): ${commandToSend.substring(0, 50)}...`);

          // Store relevant command data for retry and tracking
          try {
            // Extract command ID from the command string (format: C:ID:...)
            const cmdIdMatch = commandToSend.match(/^C:([^:]+):/);
            const cmdId = cmdIdMatch ? cmdIdMatch[1] : randomUUID().substring(0, 8);
            
            // Log the command's ID for better tracking
            logger(`[${SN}] Command ID: ${cmdId}, UUID: ${commandUUID}`);
            
            // 5. Log command sending to commands_log table (status 'sent')
            // Use INSERT OR IGNORE to avoid errors if the UUID somehow exists,
            // then UPDATE separately to ensure status/time is current for this send attempt.
            db.run(
              `INSERT OR IGNORE INTO commands_log (command, command_uuid, status, device_sn, sent_at) VALUES (?, ?, 'sent', ?, datetime('now'))`,
              [commandToSend, commandUUID, SN],
              function(err) {
                  if (err) {
                      console.error(`[${SN}] Error INSERTING sent command log UUID ${commandUUID}:`, err.message);
                  } else {
                      // Always try to update status/time in case it was already logged but not sent/executed
                      db.run(
                          `UPDATE commands_log SET status = 'sent', sent_at = datetime('now'), device_sn = ? WHERE command_uuid = ? AND status != 'executed'`,
                          [SN, commandUUID],
                          function(updateErr) {
                               if (updateErr) console.error(`[${SN}] Error UPDATING sent command log UUID ${commandUUID}:`, updateErr.message);
                               else if (this.changes > 0) logger(`[${SN}] Logged/updated sent command UUID ${commandUUID} for device ${SN}.`);
                               // else logger(`[${SN}] Command UUID ${commandUUID} already executed or no update needed.`);
                          }
                      );
                  }
              }
            );
          } catch (cmdTrackError) {
            console.error(`[${SN}] Error tracking command:`, cmdTrackError);
            // Continue with sending the command even if tracking fails
          }

          break; // Send only one command per request
        }
      }
      if (!commandToSend) {
         logger(`[${SN}] No new commands found for this device in the global queue.`);
      }
    } else {
      logger(`[${SN}] No global commands available in queue.`);
    }

    // 6. Prepare and send the response
    const responseBody = commandToSend !== null ? commandToSend : "OK";
    res.set({
      "Content-Type": "text/plain",
      "Content-Length": Buffer.byteLength(responseBody, "utf-8"),
      "Pragma": "no-cache",
      "Connection": "close",
      "Cache-Control": "no-store",
      "Date": convertToGMT(new Date()),
      "Server": "ZKTeco Server",
    });

    logger(`[${SN}] Sending response: ${responseBody === 'OK' ? 'OK' : responseBody.substring(0, 50) + '...'}`);
    return res.status(200).send(responseBody);

  } catch (error) {
    logger(`[${SN}] Error in /iclock/getrequest:`, error);
    // Check if the error came from the DB query for processed commands
    if (error instanceof Error && error.message.includes("commands_log")) {
         return res.status(500).send("ERROR: Database error checking command status.\n");
    }
    return res.status(500).send("ERROR: Internal Server Error.\n"); // Send generic error
  }
});


// POST /iclock/devicecmd?SN=<serial>
// Device sends command results. Updates commands_log status.
app.post("/iclock/devicecmd", async (req, res) => {
    const { SN } = req.query;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!SN) {
        logger(`[Unknown] Invalid devicecmd: SN missing.`);
        return res.status(400).send("ERROR: SN required.\n");
    }

    logger(`[${SN}] POST /iclock/devicecmd received from ${ipAddress}`);

    try {
        const body = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', chunk => { data += chunk.toString(); });
            req.on('end', () => resolve(data));
            req.on('error', err => reject(err));
        });

        logger(`[${SN}] Received devicecmd body: ${body}`);

        // Parse URL-encoded body using querystring
        const result = querystring.parse(body);
        logger(`[${SN}] Parsed devicecmd body: ${JSON.stringify(result)}`);

        // Check for expected fields ID and Return
        if (result.ID && result.Return !== undefined) {
            const commandIdFromDevice = result.ID; // ID from C:ID: part
            const returnCode = result.Return;
            const status = returnCode === '0' ? 'executed' : 'failed';
            const executedAt = status === 'executed' ? `datetime('now')` : null;

            logger(`[${SN}] Command ID ${commandIdFromDevice} result: ${status} (ReturnCode: ${returnCode})`);

            // Try to find by exact command ID first, then by prefix
            db.all(
                // Look for commands with matching ID that are sent to this device
                `SELECT command_uuid, command FROM commands_log
                 WHERE device_sn = ? AND status = 'sent' AND 
                 (command LIKE ? OR command LIKE ?)
                 ORDER BY sent_at DESC`,
                [SN, `C:${commandIdFromDevice}:%`, `C:${commandIdFromDevice}%:%`], // Try both exact ID and ID with sequence
                (err, rows) => {
                    if (err) {
                        console.error(`[${SN}] Error finding command_uuids for ID ${commandIdFromDevice}:`, err.message);
                        return;
                    }
                    
                    if (rows && rows.length > 0) {
                        // Update all matching commands (usually just one, but handle batch cases)
                        rows.forEach(row => {
                            const commandUUID = row.command_uuid;
                            logger(`[${SN}] Updating command ${commandUUID} with status ${status}`);
                            
                            // Update the status based on the retrieved UUID
                            db.run(
                                `UPDATE commands_log SET status = ?, executed_at = ${executedAt ?? 'NULL'}
                                WHERE command_uuid = ? AND device_sn = ? AND status = 'sent'`, // Only update if status is 'sent'
                                [status, commandUUID, SN],
                                function(updateErr) {
                                    if (updateErr) console.error(`[${SN}] Error updating command log for UUID ${commandUUID}:`, updateErr.message);
                                    else if (this.changes > 0) logger(`[${SN}] Updated command log status to ${status} for UUID ${commandUUID}.`);
                                    else logger(`[${SN}] Warning: Could not update command log for UUID ${commandUUID} (status might not be 'sent' or SN mismatch).`);
                                }
                            );
                        });
                    } else {
                        logger(`[${SN}] Warning: Could not find matching 'sent' command log entries for ID ${commandIdFromDevice} from this device. Creating fallback entry.`);
                        
                        // Create a fallback entry when we can't find a matching command
                        // This helps with status tracking for devices not properly logged before
                        const fallbackUUID = randomUUID();
                        const fallbackCommand = `C:${commandIdFromDevice}:UNKNOWN_COMMAND`;
                        db.run(
                            `INSERT INTO commands_log (command, command_uuid, status, device_sn, sent_at, executed_at) 
                             VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
                            [fallbackCommand, fallbackUUID, status, SN],
                            function(insertErr) {
                                if (insertErr) console.error(`[${SN}] Error creating fallback command log:`, insertErr.message);
                                else logger(`[${SN}] Created fallback command log for unknown command ID ${commandIdFromDevice}.`);
                            }
                        );
                    }
                }
            );
        } else {
            logger(`[${SN}] Could not parse required ID or Return code from devicecmd body.`);
        }

        // Always respond with OK to the device
        res.set({ "Content-Type": "text/plain", "Content-Length": 2, "Date": convertToGMT(new Date()), "Server": "ZKTeco Server" });
        return res.status(200).send("OK");

    } catch (error) {
        logger(`[${SN}] Error processing /iclock/devicecmd:`, error);
        res.set({ "Content-Type": "text/plain", "Content-Length": 2, "Date": convertToGMT(new Date()), "Server": "ZKTeco Server" });
        return res.status(200).send("OK"); // Send OK even on error
    }
});


// POST /iclock/cdata?SN=<serial>&table=<tablename>...
// Receives data uploads from devices (logs, etc.)
app.post("/iclock/cdata", async (req, res) => {
    const { SN } = req.query; // Get SN from query parameters
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!SN) {
        logger(`[Unknown] Invalid POST cdata: SN missing in query.`);
        return res.status(400).send("ERROR: SN required.\n");
    }

    let effectiveTable = req.query.table;
    logger(`[${SN}] POST /iclock/cdata received for table: ${effectiveTable || 'N/A'} from ${ipAddress}`);

    try {
        const body = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', chunk => { data += chunk.toString(); });
            req.on('end', () => resolve(data));
            req.on('error', err => reject(err));
        });

        logger(`[${SN}] Received POST cdata body (${body.length} bytes) for table: ${effectiveTable || 'N/A'}`);

        // --- Process data based on table ---
        if (effectiveTable === 'ATTLOG') {
            logger(`[${SN}] Processing Attendance Log data...`);
            // Add ATTLOG parsing and saving logic here
        } else if (effectiveTable === 'OPERLOG') {
             logger(`[${SN}] Processing Operation Log data...`);
             // Add OPERLOG parsing logic here
        }
        // Add more 'else if' blocks for other tables
         else {
            logger(`[${SN}] Received data for unhandled or missing table: ${effectiveTable || 'Unknown'}`);
        }

        // Always respond OK
        res.set({ "Content-Type": "text/plain", "Content-Length": 2, "Date": convertToGMT(new Date()), "Server": "ZKTeco Server" });
        return res.status(200).send("OK");

    } catch (error) {
        logger(`[${SN}] Error processing POST /iclock/cdata for table ${effectiveTable || 'N/A'}:`, error);
        res.set({ "Content-Type": "text/plain", "Content-Length": 2, "Date": convertToGMT(new Date()), "Server": "ZKTeco Server" });
        return res.status(200).send("OK"); // Send OK even on error
    }
});


// --- API Endpoints for Web UI/Admin ---

// Helper to add commands to the global queue (stores {uuid, command} in KeyValueStore key="commands")
async function addCommandsToQueue(newCommandStrings) {
    if (!Array.isArray(newCommandStrings)) {
        newCommandStrings = [newCommandStrings]; // Ensure array
    }
    if (newCommandStrings.length === 0) return;

    try {
        // Get current list (or empty array)
        const currentCommandObjects = await getValueByKey("commands") || [];
        logger(`Current command queue has ${currentCommandObjects.length} commands`);
        
        // Create new objects with UUIDs
        const commandObjectsToAdd = newCommandStrings.map(cmdStr => {
            const userPin = extractUserPinFromCommand(cmdStr);
            return {
                uuid: randomUUID(),
                command: cmdStr,
                createdAt: new Date().toISOString(),
                userPin: userPin // Store extracted userPin
            };
        });

        // Debug log for each command
        commandObjectsToAdd.forEach(cmd => {
            logger(`Adding command for userPin=${cmd.userPin}: ${cmd.command.substring(0, 50)}...`);
        });

        if (commandObjectsToAdd.length > 0) {
            // Filter out old commands for users that have new commands
            let filteredCommands = [...currentCommandObjects];
            let replacedCount = 0;
            
            for (const newCmd of commandObjectsToAdd) {
                if (newCmd.userPin) {
                    const originalLength = filteredCommands.length;
                    
                    // Determine command type
                    const isUserData = newCmd.command.includes('DATA USER');
                    const isBioPhoto = newCmd.command.includes('BIOPHOTO');
                    const isDeleteUser = newCmd.command.includes('DELETE USER');
                    
                    // Filter based on command type
                    filteredCommands = filteredCommands.filter(cmd => {
                        // Skip if no userPin match
                        if (cmd.userPin !== newCmd.userPin) return true;
                        
                        // Keep if command types don't match
                        if (isUserData && !cmd.command.includes('DATA USER')) return true;
                        if (isBioPhoto && !cmd.command.includes('BIOPHOTO')) return true;
                        if (isDeleteUser && !cmd.command.includes('DELETE USER')) return true;
                        
                        // Remove if same userPin and same command type
                        logger(`Replacing old command for userPin=${cmd.userPin}: ${cmd.command.substring(0, 50)}...`);
                        return false;
                    });
                    
                    replacedCount += originalLength - filteredCommands.length;
                }
            }
            
            // Add new commands to the filtered list
            const updatedCommands = [...filteredCommands, ...commandObjectsToAdd];
            
            // Save the updated list back to KeyValueStore, using null for userpin parameter
            await setKeyValue("commands", updatedCommands, null);
            logger(`Command queue updated: Added ${commandObjectsToAdd.length} new command(s), replaced ${replacedCount} old commands. New total: ${updatedCommands.length}`);
            
            // Also log commands to commands_log table with 'pending' status for tracking
            for (const cmdObj of commandObjectsToAdd) {
                db.run(
                    `INSERT OR IGNORE INTO commands_log (command, command_uuid, status, created_at) 
                     VALUES (?, ?, 'pending', datetime('now'))`,
                    [cmdObj.command, cmdObj.uuid],
                    (err) => {
                        if (err) console.error(`Error logging pending command ${cmdObj.uuid}:`, err.message);
                    }
                );
            }
            
            // Return the command objects that were added
            return commandObjectsToAdd;
        }
    } catch (error) {
        logger("Error adding commands to queue:", error);
        throw error; // Re-throw for caller handling
    }
}

// Helper function to extract userPin from command string
function extractUserPinFromCommand(cmdStr) {
    if (!cmdStr) return null;
    
    // Skip this for non-user commands
    const isUserCommand = cmdStr.includes('DATA USER') || 
                         cmdStr.includes('BIOPHOTO') || 
                         cmdStr.includes('DELETE USER');
                         
    if (!isUserCommand) return null;
    
    // Matches PIN=12345 in various command formats
    const pinMatch = cmdStr.match(/PIN=(\d+)(?:[\t\s]|$)/);
    if (pinMatch && pinMatch[1]) {
        const pin = pinMatch[1];
        logger(`Extracted userPin ${pin} from command`);
        return pin;
    }
    
    // Log if we failed to extract a PIN from what appears to be a user command
    if (cmdStr.includes('PIN=')) {
        logger(`Warning: Failed to extract userPin from command: ${cmdStr.substring(0, 50)}...`);
    }
    
    return null;
}

// Check if user exists by userPin in 'users' table
function checkUserExistsInUsersTable(userPin) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT id FROM users WHERE userPin = ?`, [userPin], (err, row) => {
            if (err) {
                console.error(`Error checking userPin ${userPin} in users table:`, err.message);
                reject(err);
            } else {
                resolve(!!row); // True if exists, false otherwise
            }
        });
    });
}

// Add user to 'users' table
function addUserToUsersTable(userPin, name, email = null, photoRef = null) {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO users (userPin, name, email, photo) VALUES (?, ?, ?, ?)`;
        db.run(query, [userPin, name, email, photoRef], function (err) {
            if (err) {
                 console.error(`Error adding userPin ${userPin} to users table:`, err.message);
                 reject(err);
            } else {
                 logger(`Added user ${userPin} to users table with ID ${this.lastID}.`);
                 resolve(this.lastID);
            }
        });
    });
}


// POST /api/register-user
app.post("/api/register-user", upload.single("photo"), async (req, res) => {
  const { name, userPin } = req.body;
  let { base64 } = req.body;
  let photoBase64 = null;
  let cleanupPaths = [];

  logger(`API /api/register-user: Request for PIN=${userPin}, Name=${name}`);

  // --- Validation ---
  if (!name || !userPin) return res.status(400).json({ error: "Name and userPin required." });
 
  // --- Check User Existence in central DB ---
  try {
      const userExists = await checkUserExistsInUsersTable(userPin);
      if (userExists) {
          logger(`API /api/register-user: User PIN ${userPin} already exists in users table. Updating.`);
          // Update existing user info
          await new Promise((resolve, reject) => {
              db.run(`UPDATE users SET name = ?, email = ? WHERE userPin = ?`, 
                [name, req.body.email, userPin], function(err) {
                  if (err) reject(err);
                  else resolve();
              });
          });
      }

      // --- Process Photo ---
      try {
        let inputFilePath = null;
        if (base64) { // Handle base64 input
            const matches = base64.match(/^data:(image\/(.+));base64,(.+)$/);
            if (!matches) return res.status(400).json({ message: "Invalid Base64 image format." });
            const [, mimeType, extension, base64Data] = matches;
            inputFilePath = path.join(uploadDir, `${randomUUID()}.${extension}`);
            fs.writeFileSync(inputFilePath, Buffer.from(base64Data, 'base64'));
            cleanupPaths.push(inputFilePath);
        } else if (req.file) { // Handle file upload input
            inputFilePath = req.file.path;
            cleanupPaths.push(inputFilePath);
        }

        // --- Optimize Photo if provided ---
        if (inputFilePath) {
            const optimizedPhotoPath = path.join(uploadDir, `optimized-${path.basename(inputFilePath)}.jpg`);
            cleanupPaths.push(optimizedPhotoPath);
            await sharp(inputFilePath)
                .resize(200, 200, { fit: 'cover' })
                .toFormat("jpg")
                .jpeg({ quality: 75, chromaSubsampling: "4:2:0" })
                .toFile(optimizedPhotoPath);
            photoBase64 = fs.readFileSync(optimizedPhotoPath).toString("base64");
            logger(`API /api/register-user: Photo processed for PIN ${userPin}`);
        }

        // --- Add or Update User in central 'users' DB ---
        if (userExists) {
            // If we have a photo, update it
            if (photoBase64) {
                await new Promise((resolve, reject) => {
                    db.run(`UPDATE users SET photo = ? WHERE userPin = ?`, 
                        [photoBase64, userPin], function(err) {
                            if (err) reject(err);
                            else resolve();
                        });
                });
            }
        } else {
            // Add new user
            await addUserToUsersTable(userPin, name, req.body.email, photoBase64);
        }

        // --- Prepare Device Command Strings ---
        const commandStrings = [];
        // Generate a unique ID part for this batch of commands
        const commandIdPart = randomUUID().substring(0, 8);
        const sanitizedName = name.replace(/[\t\n\r]/g, ' '); // Sanitize name
        
        // Command to add/update user info - making sure it's distinct for this user
        const userCommand = `C:${commandIdPart}01:DATA USER PIN=${userPin}\tName=${sanitizedName}\tPri=0`;
        commandStrings.push(userCommand);

        // Command to add/update the biometric photo (if available)
        if (photoBase64) {
          // Calculate size from the *buffer* before base64 encoding for accuracy
          const photoBuffer = Buffer.from(photoBase64, 'base64');
          const photoSize = photoBuffer.length;
          const photoCommand = `C:${commandIdPart}02:DATA UPDATE BIOPHOTO PIN=${userPin}\tFID=1\tNo=0\tIndex=0\tType=2\tFormat=0\tSize=${photoSize}\tContent=${photoBase64}`;
          commandStrings.push(photoCommand);
        }

        // --- Queue Commands for Devices ---
        await addCommandsToQueue(commandStrings);

        // --- Respond to API Client ---
        logger(`API /api/register-user: Queued ${commandStrings.length} commands for PIN ${userPin}.`);
        res.status(200).json({ 
            message: userExists ? "User update queued." : "User registration queued.", 
            userPin: userPin,
            commandCount: commandStrings.length
        });

      } catch (error) {
        logger(`API /api/register-user: Error processing registration for PIN ${userPin}:`, error);
        res.status(500).json({ error: "Failed to process registration." });
      } finally {
        // --- Cleanup Temporary Files ---
        cleanupPaths.forEach(fp => {
            try {
                if (fs.existsSync(fp)) {
                    fs.unlinkSync(fp);
                }
            } catch (err) {
                logger(`Warn: Failed to delete temp file ${fp}: ${err.message}`);
            }
        });
      }
  } catch (error) {
      logger(`API /api/register-user: DB error checking user PIN ${userPin}:`, error);
      return res.status(500).json({ error: "Database error checking user." });
  }
});


// POST /api/delete-user/:userPin
app.post("/api/delete-user/:userPin", async (req, res) => {
    const { userPin } = req.params;
    logger(`API /api/delete-user: Request for PIN=${userPin}`);

    if (!userPin || !/^\d+$/.test(userPin)) return res.status(400).json({ error: "Valid userPin required." });

    try {
        // Check if user exists in central DB first
        const exists = await checkUserExistsInUsersTable(userPin);
        if (!exists) {
            logger(`API /api/delete-user: User PIN ${userPin} not found in users table.`);
            return res.status(404).json({ error: `User PIN ${userPin} not found.` });
        }

        // Prepare command string
        const commandIdPart = randomUUID().substring(0, 8);
        const commandString = `C:${commandIdPart}:DATA DELETE USER PIN=${userPin}`;

        // Queue command for devices
        await addCommandsToQueue([commandString]);

        // Delete user from central 'users' database
        db.run(`DELETE FROM users WHERE userPin = ?`, [userPin], function(err) {
            if (err) {
                // Log error but proceed, command is queued
                logger(`API /api/delete-user: Error deleting user ${userPin} from local DB: ${err.message}`);
            } else {
                logger(`API /api/delete-user: Deleted user ${userPin} from local DB (${this.changes} rows).`);
            }
        });

        // Respond to API client
        logger(`API /api/delete-user: Queued deletion command for user PIN ${userPin}.`);
        res.status(200).json({ message: `Deletion queued for user PIN ${userPin}.` });

    } catch (error) {
        logger(`API /api/delete-user: Error processing deletion for PIN ${userPin}:`, error);
        res.status(500).json({ error: "Failed to queue user deletion." });
    }
});


// GET /api/users - Retrieve users from central DB
app.get("/api/users", (req, res) => {
    const query = `SELECT id, userPin, name, email FROM users ORDER BY name`;
    db.all(query, [], (err, rows) => {
        if (err) {
            logger("API /api/users: Error fetching users:", err.message);
            res.status(500).json({ error: "Failed to retrieve users." });
        } else {
            res.status(200).json(rows);
        }
    });
});

// GET /api/devices - Retrieve basic device info
app.get("/api/devices", (req, res) => {
    const query = `SELECT sn, last_seen, ip_address FROM Devices ORDER BY last_seen DESC`;
    db.all(query, [], (err, rows) => {
        if (err) {
            logger("API /api/devices: Error fetching devices:", err.message);
            res.status(500).json({ error: "Failed to retrieve devices." });
        } else {
            res.status(200).json(rows);
        }
    });
});

// GET /api/command-queue - View current global command queue
app.get("/api/command-queue", async (req, res) => {
    try {
        const commandObjects = await getValueByKey("commands") || [];
        res.status(200).json(commandObjects);
    } catch (error) {
        logger("API /api/command-queue: Error fetching queue:", error);
        res.status(500).json({ error: "Failed to retrieve command queue." });
    }
});

// DELETE /api/command-queue - Clear global command queue
app.delete("/api/command-queue", async (req, res) => {
    try {
        // Pass null for userpin when clearing the global commands key
        await setKeyValue("commands", [], null);
        logger("API /api/command-queue: Global command queue cleared.");
        // Optionally clear related 'sent'/'pending' entries from commands_log?
        // db.run(`DELETE FROM commands_log WHERE status IN ('pending', 'sent')`);
        res.status(200).json({ message: "Command queue cleared." });
    } catch (error) {
        logger("API /api/command-queue: Error clearing queue:", error);
        res.status(500).json({ error: "Failed to clear command queue." });
    }
});

// GET /api/command-log - View command execution log
app.get("/api/command-log", (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const query = `
        SELECT id, command_uuid, status, device_sn, created_at, sent_at, executed_at, substr(command, 1, 80) as command_preview
        FROM commands_log ORDER BY id DESC LIMIT ?`; // Order by ID desc for recent first
    db.all(query, [limit], (err, rows) => {
        if (err) {
            logger("API /api/command-log: Error fetching log:", err.message);
            res.status(500).json({ error: "Failed to retrieve command log." });
        } else {
            res.status(200).json(rows);
        }
    });
});


// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  logger(`Server running on http://0.0.0.0:${PORT}`);
});

// --- Graceful Shutdown ---
process.on("SIGINT", () => {
  logger("SIGINT received: Closing database...");
  db.close((err) => {
    if (err) console.error("Error closing database:", err.message);
    else console.log("Database connection closed.");
    process.exit(0);
  });
});
