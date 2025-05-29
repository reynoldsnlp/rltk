package werti.server.interaction.storage;

import werti.server.interaction.data.Task;
import werti.server.interaction.data.Submission;
import werti.server.interaction.data.TaskPerformance;

import java.util.List;
import java.util.Optional;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
public interface TrackingStorage {
    List<Submission> getTaskLogEntries(final Task task)
            throws ViewStorageException;
    Optional<TaskPerformance> getPerformance(final Task task, String enhancementId)
            throws ViewStorageException;
    List<TaskPerformance> getAllPerformances(final Task task)
            throws ViewStorageException;
    void updateProgress(Submission logEntry, TaskPerformance taskPerformance)
            throws ViewStorageException;
}
