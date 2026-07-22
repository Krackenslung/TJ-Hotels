import pyodbc
import config


# Raised when the DB is unreachable or misconfigured — callers get a clear
# error instead of the old behavior of returning None and crashing later.
class DatabaseConnectionError(Exception):
    pass


class SQLServerConnection:
    @staticmethod
    def get_connection():
        # Read configuration (config.py loads .env once)
        server = config.SQL_SERVER
        database = config.SQL_DATABASE
        user = config.SQL_USER
        password = config.SQL_PASSWORD
        #check parameters
        missing = [name for name, value in (
            ("SQL_SERVER", server),
            ("SQL_DATABASE", database),
            ("SQL_USER", user),
            ("SQL_PASSWORD", password),
        ) if not value]
        if missing:
            raise DatabaseConnectionError(
                f"Configuration error: {', '.join(missing)} not found in .ENV File."
            )
        # Connection string
        connectionString = (
            "DRIVER={ODBC Driver 18 for SQL Server};"
            f"SERVER={server};"
            f"DATABASE={database};"
            f"UID={user};"
            f"PWD={password};"
            "Encrypt=yes;"
            "TrustServerCertificate=yes;"
        )

        try:
            # Try connection
            connection = pyodbc.connect(connectionString)
            # set utf-8 encoding/decoding
            connection.setencoding(encoding='utf-8')
            connection.setdecoding(pyodbc.SQL_CHAR, encoding='utf-8')
            connection.setdecoding(pyodbc.SQL_WCHAR, encoding='utf-8')
        except Exception as ex:
            raise DatabaseConnectionError(
                "Could not connect to SQL Server: " + str(ex)
            )

        # return
        return connection
