package werti.server.interaction.storage;

import org.skife.jdbi.v2.DBI;
import werti.server.data.Topics;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;


/**
 * @author Aleksandar Dimitrov
 * @since 2017-02-23
 */
public class H2StorageEngine implements StorageEngine {
    private final H2TaskStorage taskStorage;
    private final Connection myConnection;
    private final H2TrackingStorage trackingStorage;
    private final DBI dbi;

    public H2StorageEngine(
            DataSource dataSource,
            Topics topics
    ) throws SQLException {
        myConnection = dataSource.getConnection();
        dbi = new JdbiFactory(dataSource).getDbi();
        taskStorage = new H2TaskStorage(dbi, topics);
        trackingStorage = new H2TrackingStorage(dbi);
    }

    public DBI getDbi() {
        return dbi;
    }

    @Override
    public void close() throws ViewStorageException {
        try {
            myConnection.close();
        } catch (SQLException e) {
            throw new ViewStorageException(e);
        }
    }

    @Override
    public TaskStorage getTaskStorage() {
        return taskStorage;
    }

    @Override
    public TrackingStorage getTrackingStorage() {
        return trackingStorage;
    }
}
