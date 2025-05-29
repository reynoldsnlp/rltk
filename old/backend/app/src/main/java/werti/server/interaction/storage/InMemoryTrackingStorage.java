package werti.server.interaction.storage;

import com.google.auto.value.AutoValue;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.Iterators;
import werti.server.interaction.data.Task;
import werti.server.interaction.data.Submission;
import werti.server.interaction.data.TaskPerformance;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
public class InMemoryTrackingStorage implements TrackingStorage {
    private final Map<PerformanceKey, TaskPerformance> performanceLog;
    private final Map<Task, List<Submission>> taskLog;

    @AutoValue
    abstract static class PerformanceKey {
        abstract Task task();
        abstract String enhancementId();

        public static PerformanceKey create(Task task, String enhancementId) {
            return new AutoValue_InMemoryTrackingStorage_PerformanceKey(task, enhancementId);
        }
    }

    public InMemoryTrackingStorage(
            Map<PerformanceKey, TaskPerformance> performanceLog,
            Map<Task, List<Submission>> taskLog
    ) {
        this.performanceLog = performanceLog;
        this.taskLog = taskLog;
    }

    @Override
    public List<Submission> getTaskLogEntries(Task task) {
        return Optional.ofNullable(taskLog.get(task)).orElse(ImmutableList.of());
    }

    @Override
    public Optional<TaskPerformance> getPerformance(Task task, String enhancementId) {
        return Optional.ofNullable(performanceLog.get(PerformanceKey.create(task, enhancementId)));
    }

    @Override
    public List<TaskPerformance> getAllPerformances(Task task) throws ViewStorageException {
        return performanceLog.entrySet().stream()
                             .filter(entry -> entry.getKey().task().equals(task))
                             .map(Map.Entry::getValue)
                             .collect(Collectors.toList());
    }

    @Override
    public void updateProgress(
            Submission logEntry, TaskPerformance taskPerformance
    ) {
        taskLog.merge(
                logEntry.task(),
                ImmutableList.of(logEntry),
                (l1, l2) -> ImmutableList.copyOf(Iterators.concat(l1.iterator(), l2.iterator()))
        );

        performanceLog.put(
                PerformanceKey.create(taskPerformance.task(), taskPerformance.enhancementId()),
                taskPerformance
        );
    }
}
