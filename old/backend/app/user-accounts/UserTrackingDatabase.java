package werti.tracking;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import javax.naming.InitialContext;
import javax.naming.NamingException;
import javax.sql.DataSource;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

/**
 * This class provides an easy-access interface to the user tracking database.
 * It has methods for common tasks like inserting or retrieving entries and
 * encapsulates the SQL code for them. Other classes should never execute SQL
 * code themselves, but always use this class's methods.
 * 
 * @author Marion Zepf
 * 
 */
public class UserTrackingDatabase {

    private static final Logger log =
            LogManager.getLogger();

    private DataSource connectionPool;

    private static final String SQL_TEMPLATE_SELECT = "SELECT %s FROM %s %s";
    private static final String SQL_TEMPLATE_INSERT = "INSERT INTO %s VALUES (%s)";

    /**
     * Callback that converts the result of a SELECT query into something that
     * can be used more easily later in the code.
     * 
     * TODO[Java8] replace this callback hack with lambdas
     * 
     * @param <TargetType>
     *            the output type of the conversion
     */
    private interface QueryResultConverter<TargetType> {
        TargetType convertQueryResult(ResultSet result) throws SQLException;
    }

    /**
     * Establish a few connections to the database and keep them around in a
     * pool, so they can be used by the various threads when calling the other
     * methods of this class.
     * 
     * @throws NamingException
     *             if JDNI fails to find the JDBC for MySQL
     */
    public UserTrackingDatabase() throws NamingException {
        InitialContext ctx = new InitialContext();
        // the servlet container backs this with a connection pool
        connectionPool = (DataSource) ctx.lookup("java:comp/env/jdbc/MySQLDB");
    }

    /**
     * Get the biggest enhancement ID used.
     * 
     * @param defaultId
     *            ID to return if the database doesn't contain any enhancements
     *            or an error occurs
     * @return biggest enhancement ID in the database
     */
    public long getMaxEnhancementId(long defaultId) {
        long maxId = defaultId;
        try {
            maxId = selectMaxIdFrom(Enhancement.TABLE_NAME);
        } catch (SQLException sqlEx) {
            log.warn(String.format("Failed to get maximum enhancement ID, " +
                    "using %d instead", defaultId), sqlEx);
        }
        return maxId;
    }

    /**
     * Get the biggest input ID used.
     * 
     * @param defaultId
     *            ID to return if the database doesn't contain any inputs or an
     *            error occurs
     * @return biggest input ID in the database
     */
    public long getMaxInputId(long defaultId) {
        long maxId = defaultId;
        try {
            maxId = selectMaxIdFrom(Input.TABLE_NAME);
        } catch (SQLException sqlEx) {
            log.warn(String.format("Failed to get maximum input ID, " +
                    "using %d instead", defaultId), sqlEx);
        }
        return maxId;
    }

    /**
     * Return the enhancement with the given ID or null if no such enhancement
     * was recorded in the database.
     * 
     * @param id
     *            ID of the enhancement to return
     * @return read-only information on the enhancement or null if there is no
     *         enhancement with the given ID or an error occurs
     */
    public Enhancement getEnhancementById(long id) {
        Enhancement enh = null;
        String whereClause = String.format("WHERE id = %d", id);
        List<Enhancement> enhList = new ArrayList<Enhancement>(0);
        try {
            enhList = selectFrom(Enhancement.TABLE_NAME, whereClause);
        } catch (SQLException sqlEx) {
            log.warn("Failed to get enhancement with ID " + id, sqlEx);
        }
        // the column 'id' is the primary key, so there is only one row
        if (!enhList.isEmpty()) {
            enh = enhList.get(0);
        }
        return enh;
    }

    /**
     * Return the input with the given ID or null if no such input was recorded
     * in the database.
     * 
     * @param id
     *            ID of the input to return
     * @return read-only information on the input or null if there is no input
     *         with the given ID or an error occurs
     */
    public Input getInputById(long id) {
        Input input = null;
        String whereClause = String.format("WHERE id = %d", id);
        List<Input> inputList = new ArrayList<Input>(0);
        try {
            inputList = selectFrom(Input.TABLE_NAME, whereClause);
        } catch (SQLException sqlEx) {
            log.warn("Failed to get input with ID " + id, sqlEx);
        }
        // the column 'id' is the primary key, so there is only one row
        if (!inputList.isEmpty()) {
            input = inputList.get(0);
        }
        return input;
    }

    /**
     * Return all recorded inputs that refer to the given enhancement ID.
     * 
     * @param enhId
     *            ID of the enhancement that the inputs belong to
     * @return list of read-only information on the inputs or empty list if
     *         there is no such input or an error occurs
     */
    public List<Input> getAllInputsByEnhId(long enhId) {
        String whereClause = String.format("WHERE enhId = %d", enhId);
        List<Input> inputList = new ArrayList<Input>(0);
        try {
            inputList = selectFrom(Input.TABLE_NAME, whereClause);
        } catch (SQLException sqlEx) {
            log.warn("Failed to get all inputs with enhancement ID " + enhId,
                    sqlEx);
        }
        return inputList;
    }

    /**
     * Add the given enhancement to the database.
     * 
     * @param enh
     *            information on the enhancement to add
     */
    public void addEnhancement(Enhancement enh) {
        try {
            insertInto(Enhancement.TABLE_NAME, enh.toSQLValueListString());
        } catch (SQLException sqlEx) {
            log.warn("Failed to add enhancement with ID " + enh.id, sqlEx);
        }
    }

    /**
     * Add the given input to the database.
     * 
     * @param input
     *            information on the input to add
     */
    public void addInput(Input input) {
        try {
            insertInto(Input.TABLE_NAME, input.toSQLValueListString());
        } catch (SQLException sqlEx) {
            log.warn("Failed to add input with ID " + input.id, sqlEx);
        }
    }

    /**
     * Run 'SELECT * FROM mytable ...' with 'mytable' being the given table and
     * '...' being the given whereSuffix. Of course, the suffix does not need
     * to contain a WHERE clause and it may contain additional clauses, such as
     * ORDER BY.
     * 
     * @param <T>
     *            Java type corresponding to the SQL table
     * @param whereSuffix
     *            rest of the query after the table name
     * @return a list of T objects corresponding to the returned rows
     * @throws SQLException
     */
    private <T extends Data> List<T> selectFrom(String tableName,
            String whereSuffix) throws SQLException {
        String sqlQuery = String.format(SQL_TEMPLATE_SELECT, "*", tableName,
                whereSuffix);
        @SuppressWarnings("unchecked")
        List<T> enhList = (List<T>) runSQLQuery(sqlQuery,
                new QueryResultConverter<List<T>>() {
                    @Override
                    public List<T> convertQueryResult(
                            ResultSet result) throws SQLException {
                        return (List<T>) T.parseFromSQLResult(result);
                    }
                });
        return enhList;
    }

    /**
     * Run 'SELECT max(id) FROM mytable' with 'mytable' being the given table.
     * 
     * @return the maximum ID or zero if the table is empty
     * @throws SQLException
     */
    private long selectMaxIdFrom(String tableName)
            throws SQLException {
        String sqlQuery = String.format(SQL_TEMPLATE_SELECT, "max(id)",
                tableName, "");
        long maxId = (Long) runSQLQuery(sqlQuery,
                new QueryResultConverter<Long>() {
                    @Override
                    public Long convertQueryResult(ResultSet result)
                            throws SQLException {
                        if (result.first()) {
                            return result.getLong(1);
                        } else {
                            return 0L;
                        }
                    }
                });
        return maxId;
    }

    /**
     * Run 'INSERT INTO mytable VALUES (...)' with 'mytable' being the given
     * table and '...' being the given values.
     * 
     * @param values
     *            String containing the (escaped!) values to insert without
     *            parentheses
     * @throws SQLException
     */
    private void insertInto(String tableName, String values)
            throws SQLException {
        String sqlQuery = String.format(SQL_TEMPLATE_INSERT, tableName, values);
        runSQLQuery(sqlQuery);
    }

    /**
     * Run the given SQL query on the database.
     * 
     * @param sqlQuery
     *            a database query in the SQL language
     * @throws SQLException
     *             if the connection fails or the query causes an error
     */
    private void runSQLQuery(String sqlQuery) throws SQLException {
        runSQLQuery(sqlQuery, new QueryResultConverter<Object>() {
            @Override
            public Object convertQueryResult(ResultSet result)
                    throws SQLException {
                return null;
            }
        });
    }

    /**
     * Run the given SQL query on the database. Pass the result that is
     * returned by the query to the converter callback and return the converted
     * result.
     * 
     * @param sqlQuery
     *            a database query in the SQL language
     * @param callback
     *            converter to pass the result of the query to
     * @return the rows returned in response to the SELECT query or null
     * @throws SQLException
     *             if the connection fails or the query causes an error
     */
    private Object runSQLQuery(String sqlQuery,
            @SuppressWarnings("rawtypes") QueryResultConverter callback)
            throws SQLException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet result = null;
        Object returnValue = null;
        try {
            conn = connectionPool.getConnection();
            log.debug("Connected to user tracking database");
            stmt = conn.createStatement();
            log.debug("Execute SQL query: " + sqlQuery);
            // execute() returns true iff it's a SELECT statement
            if (stmt.execute(sqlQuery)) {
                result = stmt.getResultSet();
            }
            returnValue = callback.convertQueryResult(result);
        } finally {
            log.debug("Cleanup after running a SQL query");
            // free up the resources we used
            if (result != null) {
                try {
                    result.close();
                } catch (SQLException sqlEx) {
                    // ignore
                }
            }
            if (stmt != null) {
                try {
                    stmt.close();
                } catch (SQLException sqlEx) {
                    // ignore
                }
            }
            if (conn != null) {
                try {
                    conn.close();
                } catch (SQLException sqlEx) {
                    // ignore
                }
            }
        }
        return returnValue;
    }

}
