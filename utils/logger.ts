import * as FileSystem from "expo-file-system/legacy";
import { ToastAndroid } from "react-native";

interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  category: string;
  message: string;
  data?: any;
  stack?: string;
}

class Logger {
  private logFilePath: string;
  private maxLogSize = 5 * 1024 * 1024; // 5MB
  private isInitialized = false;

  constructor() {
    this.logFilePath = `${FileSystem.documentDirectory}app_logs.txt`;
  }

  private async initialize() {
    if (this.isInitialized) return;

    try {
      const fileInfo = await FileSystem.getInfoAsync(this.logFilePath);

      // Create log file if it doesn't exist
      if (!fileInfo.exists) {
        await FileSystem.writeAsStringAsync(
          this.logFilePath,
          "=== App Logs ===\n",
          {
            encoding: FileSystem.EncodingType.UTF8,
          }
        );
      }

      // Check file size and rotate if needed
      if (fileInfo.exists && fileInfo.size && fileInfo.size > this.maxLogSize) {
        await this.rotateLogs();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize logger:", error);
    }
  }

  private async rotateLogs() {
    try {
      const backupPath = `${FileSystem.documentDirectory}app_logs_backup.txt`;

      // Delete old backup if exists
      const backupInfo = await FileSystem.getInfoAsync(backupPath);
      if (backupInfo.exists) {
        await FileSystem.deleteAsync(backupPath);
      }

      // Move current log to backup
      await FileSystem.moveAsync({
        from: this.logFilePath,
        to: backupPath,
      });

      // Create new log file
      await FileSystem.writeAsStringAsync(
        this.logFilePath,
        "=== App Logs (Rotated) ===\n",
        {
          encoding: FileSystem.EncodingType.UTF8,
        }
      );
    } catch (error) {
      console.error("Failed to rotate logs:", error);
    }
  }

  private async writeLog(entry: LogEntry) {
    try {
      await this.initialize();

      const logLine = `[${entry.timestamp}] [${entry.level}] [${
        entry.category
      }] ${entry.message}\n${
        entry.data ? `Data: ${JSON.stringify(entry.data, null, 2)}\n` : ""
      }${entry.stack ? `Stack: ${entry.stack}\n` : ""}${"=".repeat(80)}\n`;

      // Also log to console
      console.log(logLine);
      let existingContent = "";
      try {
        existingContent = await FileSystem.readAsStringAsync(this.logFilePath);
      } catch (readError: any) {
        // If the file doesn't exist, readAsStringAsync will throw an error.
        // We can ignore this and proceed with an empty string for existingContent.
        if (readError.code !== "E_FILE_NOT_FOUND") {
          console.error("Error reading existing file content:", readError);
          throw readError; // Re-throw if it's a different error
        }
      }

      const newContent =
        existingContent +
        "\n----------------------------------------\n" +
        logLine;

      // Write to file
      await FileSystem.writeAsStringAsync(this.logFilePath, newContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      console.error("Failed to write log:", error);
    }
  }

  info(category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "INFO",
      category,
      message,
      data,
    };
    this.writeLog(entry);
  }

  warn(category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "WARN",
      category,
      message,
      data,
    };
    this.writeLog(entry);
  }

  error(category: string, message: string, error?: any, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "ERROR",
      category,
      message,
      data,
      stack: error?.stack || error?.toString(),
    };
    this.writeLog(entry);
    ToastAndroid.show(`Stored logs in ${this.logFilePath}`, ToastAndroid.LONG);
  }

  async getLogs(): Promise<string> {
    try {
      await this.initialize();
      const logs = await FileSystem.readAsStringAsync(this.logFilePath, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return logs;
    } catch (error) {
      console.error("Failed to read logs:", error);
      return "Failed to read logs";
    }
  }

  async clearLogs(): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(
        this.logFilePath,
        "=== App Logs (Cleared) ===\n",
        {
          encoding: FileSystem.EncodingType.UTF8,
        }
      );
      this.info("LOGGER", "Logs cleared");
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  }

  async exportLogs(): Promise<string> {
    try {
      await this.initialize();
      return this.logFilePath;
    } catch (error) {
      console.error("Failed to export logs:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience functions
export const logInfo = (category: string, message: string, data?: any) => {
  logger.info(category, message, data);
};

export const logWarn = (category: string, message: string, data?: any) => {
  logger.warn(category, message, data);
};

export const logError = (
  category: string,
  message: string,
  error?: any,
  data?: any
) => {
  logger.error(category, message, error, data);
};
