package werti.server.interaction.storage;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-02-23
 */
public interface StorageEngine {
    void close() throws ViewStorageException;
    TaskStorage getTaskStorage();
    TrackingStorage getTrackingStorage();
}
