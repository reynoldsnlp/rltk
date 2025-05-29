package werti.server.interaction.transfer;

import com.google.auto.value.AutoValue;
import werti.server.interaction.data.Submission;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-03-27
 */
@AutoValue
public abstract class TaskLogResponseData {
    public abstract int task();
    public abstract String enhancementId();
    public abstract long timestamp();
    public abstract String submission();
    public abstract String assessment();

    public static TaskLogResponseData create(Submission logEntry) {
        return create(
                logEntry.task().taskId(),
                logEntry.enhancementId(),
                logEntry.timestamp().getTime(),
                logEntry.submission(),
                logEntry.feedback().name()
        );
    }

    public static TaskLogResponseData create(
            int task,
            String enhancementId,
            long timestamp,
            String submission,
            String assessment
    ) {
        return new AutoValue_TaskLogResponseData(
                task,
                enhancementId,
                timestamp,
                submission,
                assessment
        );
    }
}
