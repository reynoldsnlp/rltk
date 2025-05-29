package werti.server.interaction.storage;

import com.google.inject.Inject;

import java.util.ArrayList;
import java.util.HashMap;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-02-23.02.17
 */
public class InMemoryStorage implements StorageEngine {

    private final InMemoryTaskStorage taskStorage;
    private final InMemoryTrackingStorage trackingStorage;

    @Inject
    public InMemoryStorage() {
        this.taskStorage = new InMemoryTaskStorage(
                new ArrayList<>()
        );

        this.trackingStorage = new InMemoryTrackingStorage(
                new HashMap<>(),
                new HashMap<>()
        );
    }

    @Override
    public void close() throws ViewStorageException {
        // no-op, as we don't have closable storage
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
