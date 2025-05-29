package werti.server.data;

import com.google.auto.value.AutoValue;
import werti.Language;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
@AutoValue
public abstract class TaskData {
    public abstract Language language();
    public abstract Topic topic();
    public abstract Activity activity();
    public abstract String filter();

    public static TaskData create(
            Language language,
            Topic topic,
            Activity activity,
            String filter
    ) {
        return new AutoValue_TaskData(
                language,
                topic,
                activity,
                filter
        );
    }
}
