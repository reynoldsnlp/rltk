package werti.server;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.h2.jdbcx.JdbcDataSource;
import org.skife.jdbi.v2.DBI;
import werti.ViewContext;
import werti.server.interaction.storage.InMemoryStorage;
import werti.server.interaction.storage.JdbiFactory;

import javax.sql.DataSource;

/**
 *  Always boot up with storage, Sql-backed if possible, and fallback to using POJOs.
 *  We try, in order:
 *
 * <ol>
 *  <li>to set up a JDBC data source specified in the porperties.</li>
 *  <li>to set up an h2 in-memory JDBC data source</li>
 *  <li>finally, to set up the <tt>{@link InMemoryStorage}</tt>, which is guaranteed to come up</li>
 * </ol>
 *
 * @author Aleksandar Dimitrov
 * @since 2017-03-05
 */
class StorageEngineDiscovery {
    private final ViewContext viewContext;

    StorageEngineDiscovery(final ViewContext viewContext){
        this.viewContext = viewContext;
    }

    private static final Logger log = LogManager.getLogger();
    private static final String IN_MEMORY_URL = "jdbc:h2:mem:temporary;DB_CLOSE_DELAY=-1";
    private static final String MESSAGE_O_DOOM =
            "Using in-memory database. ALL TASK AND TRACKING DATA WILL BE LOST " +
                    "WHEN THE SERVER SHUTS DOWN.";

    DBI getDbi() {
        final DataSource dataSource = getDataSource();
        return new JdbiFactory(dataSource).getDbi();
    }

    // If we can't find a database, issue a warning and boot up with an SQL-backed
    // in-memory database.
    private DataSource getDataSource() {
        final String url      = viewContext.getProperty("database.url");
        final String user     = viewContext.getProperty("database.user");
        final String password = viewContext.getProperty("database.password");

        if (url == null || user == null || password == null) {
            log.error("Couldn't find database url in config. " + MESSAGE_O_DOOM);
            final JdbcDataSource dataSource = new JdbcDataSource();
            dataSource.setURL(IN_MEMORY_URL);
            return dataSource;
        }

        final JdbcDataSource dataSource = new JdbcDataSource();

        dataSource.setURL(url);
        dataSource.setUser(user);
        dataSource.setPassword(password);
        return dataSource;
    }
}
