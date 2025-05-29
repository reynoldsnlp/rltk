package werti.server.interaction.storage;

import org.flywaydb.core.Flyway;
import org.skife.jdbi.v2.DBI;

import javax.sql.DataSource;

/**
 * Create a connection to a database from a configured <tt>{@link DataSource}</tt>.
 * This class applies all migrations, if any are necessary.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-03-06
 */
public class JdbiFactory {
    private final DataSource dataSource;

    public JdbiFactory(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Return a <em>new instance</em> of {@link DBI}, from this factory's <tt>DataSource</tt>.
     * The database will be fully patched up to the newest version.
     *
     * @return A fully migrated database
     */
    public DBI getDbi() {
        final Flyway flyway = new Flyway();
        flyway.setDataSource(dataSource);
        flyway.migrate();

        return new DBI(dataSource);
    }
}
