package werti.server.interaction.storage;

import org.skife.jdbi.v2.StatementContext;
import org.skife.jdbi.v2.tweak.ResultSetMapper;
import werti.server.analysis.ViewRequestException;
import werti.server.data.TaskData;
import werti.server.data.Topics;
import werti.server.interaction.data.Task;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.WebPage;

import java.net.MalformedURLException;
import java.net.URL;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-02-24
 */
public class TaskMapper implements ResultSetMapper<Task> {

    private final Topics topics;
    private final User user;

    public TaskMapper(final Topics topics, final User user) {
        this.topics = topics;
        this.user = user;
    }

    @Override
    public Task map(int i, ResultSet resultSet, StatementContext statementContext) throws SQLException {
        final String userId = resultSet.getString("UserId");

        if (!userId.equals(user.uid())) {
            throw new SQLException("User ids did not match!");
        }

        final TaskData task;

        try {
            task = topics.getTaskData(
                    resultSet.getString("Language"),
                    resultSet.getString("Topic"),
                    resultSet.getString("Activity"),
                    resultSet.getString("Filter")
            );
        } catch (ViewRequestException e) {
            throw new SQLException(
                    "The task data in the database does not exist in the current topic configuration.",
                    e
            );
        }

        try {
            final WebPage page = WebPage.create(
                    new URL(resultSet.getString("Url")),
                    resultSet.getString("Title")
            );
            return Task.create(
                    user,
                    resultSet.getInt("ID"),
                    page,
                    task.topic(),
                    task.activity(),
                    task.language(),
                    task.filter(),
                    resultSet.getDate("Timestamp"),
                    resultSet.getInt("NumberOfExercises")
            );
        } catch (MalformedURLException e) {
            throw new SQLException(e);
        }
    }
}
