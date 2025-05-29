package werti.server.interaction.storage;

import org.skife.jdbi.v2.sqlobject.Bind;
import org.skife.jdbi.v2.sqlobject.GetGeneratedKeys;
import org.skife.jdbi.v2.sqlobject.SqlQuery;
import org.skife.jdbi.v2.sqlobject.SqlUpdate;
import org.skife.jdbi.v2.sqlobject.mixins.CloseMe;
import werti.server.interaction.data.Task;

import java.util.Date;
import java.util.List;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-02-24
 */
public interface H2TaskDao extends CloseMe {
    @SqlUpdate(
            "INSERT INTO Task (UserId, Url, Title, Topic, Activity, Language, Filter, Timestamp, " +
                    "NumberOfExercises) " +
            "VALUES (:userId, :url, :title, :topic, :activity, :language, :filter, :timestamp, :numberOfExercises)"
    )
    @GetGeneratedKeys
    int insertTask(
            @Bind("userId") String userId,
            @Bind("url") String url,
            @Bind("title") String title,
            @Bind("topic") String topic,
            @Bind("activity") String activity,
            @Bind("language") String language,
            @Bind("filter") String filter,
            @Bind("timestamp") Date timestamp,
            @Bind("numberOfExercises") int numberOfExercises
    );

    @SqlQuery(
            "SELECT ID, UserId, Language, Topic, Activity, Filter, Url, Title, Timestamp, NumberOfExercises " +
                    "FROM Task " +
                    "WHERE ID = :taskId"
    )
    Task query(@Bind("taskId") int taskId);

    @SqlQuery(
            "SELECT ID, UserId, Language, Topic, Activity, Filter, Url, Title, Timestamp, NumberOfExercises " +
                    "FROM Task " +
                    "WHERE UserId = :userId"
    )
    List<Task> getTasksForUser(@Bind("userId") String userId);
}
