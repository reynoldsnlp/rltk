package werti.server.interaction.storage;

import com.google.common.collect.ImmutableList;
import com.google.inject.Inject;
import com.google.inject.name.Named;
import org.skife.jdbi.v2.DBI;
import org.skife.jdbi.v2.StatementContext;
import org.skife.jdbi.v2.sqlobject.Bind;
import org.skife.jdbi.v2.sqlobject.SqlQuery;
import org.skife.jdbi.v2.sqlobject.SqlUpdate;
import org.skife.jdbi.v2.sqlobject.Transaction;
import org.skife.jdbi.v2.tweak.ResultSetMapper;
import werti.server.interaction.data.Submission;
import werti.server.interaction.data.Task;
import werti.server.interaction.data.TaskPerformance;
import werti.server.interaction.feedback.FeedbackMessage;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Optional;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-02-24
 */
public class H2TrackingStorage implements TrackingStorage {
    private DBI dbi;

    @Inject
    H2TrackingStorage(@Named("h2-dbi") DBI dbi) {
        this.dbi = dbi;
    }

    @Override
    public List<Submission> getTaskLogEntries(Task task) throws ViewStorageException {
        return dbi.withHandle(handle -> {
            final TaskLogEntryMapper mapper = new TaskLogEntryMapper(task);
            handle.registerMapper(mapper);
            return handle.attach(TransactionDao.class).queryLogEntries(task.taskId());
        });
    }

    @Override
    public Optional<TaskPerformance> getPerformance(Task task, String enhancementId) throws ViewStorageException {
        return Optional.ofNullable(dbi.withHandle(handle -> {
            final TaskPerformanceMapper mapper = new TaskPerformanceMapper(task);
            handle.registerMapper(mapper);
            return handle.attach(TransactionDao.class).queryTaskPerformance(task.taskId(), enhancementId);
        }));
    }

    @Override
    public List<TaskPerformance> getAllPerformances(Task task) throws ViewStorageException {
        return Optional.ofNullable(dbi.withHandle(handle -> {
            handle.registerMapper(new TaskPerformanceMapper(task));
            return handle.attach(TransactionDao.class).queryAllPerformances(task.taskId());
        })).orElse(ImmutableList.of());
    }

    @Override
    public void updateProgress(Submission logEntry, TaskPerformance taskPerformance) throws ViewStorageException {
        dbi.useHandle(handle ->
                handle.attach(TransactionDao.class).updateProgress(logEntry, taskPerformance)
        );
    }

    private static class TaskLogEntryMapper implements ResultSetMapper<Submission> {
        private final Task task;
        private final Calendar calendar;

        TaskLogEntryMapper(final Task task) {
            this.task = task;
            calendar = Calendar.getInstance();
        }

        @Override
        public Submission map(int i, ResultSet resultSet, StatementContext statementContext) throws SQLException {
            calendar.setTimeInMillis(resultSet.getTimestamp("Timestamp").getTime());
            return Submission.create(
                    task,
                    resultSet.getString("EnhancementId"),
                    calendar.getTime(),
                    resultSet.getString("Submission"),
                    FeedbackMessage.valueOf(resultSet.getString("Feedback")),
                    resultSet.getString("FeedbackText")
            );
        }
    }

    private static class TaskPerformanceMapper implements ResultSetMapper<TaskPerformance> {
        private final Task task;

        TaskPerformanceMapper(final Task task) {
            this.task = task;
        }

        @Override
        public TaskPerformance map(int i, ResultSet resultSet, StatementContext statementContext) throws SQLException {
            return TaskPerformance.create(
                    resultSet.getString("EnhancementId"),
                    task,
                    resultSet.getString("CorrectAnswer"),
                    resultSet.getInt("NumberOfTries"),
                    resultSet.getBoolean("UsedSolution"),
                    resultSet.getString("Sentence"),
                    FeedbackMessage.valueOf(resultSet.getString("Feedback"))
            );
        }
    }

    private interface TransactionDao {
        @SqlQuery("SELECT * FROM Performance WHERE taskId = :taskId AND enhancementId = :enhancementId")
        TaskPerformance queryTaskPerformance(@Bind("taskId") int taskId, @Bind("enhancementId") String enhancementId);

        @SqlQuery("SELECT * FROM Performance WHERE taskId = :taskId")
        List<TaskPerformance> queryAllPerformances(@Bind("taskId") int i);

        @SqlQuery("SELECT * FROM Submission WHERE taskId = :taskId")
        List<Submission> queryLogEntries(@Bind("taskId") int taskId);

        @SqlUpdate("INSERT INTO Submission " +
                "(TaskId, EnhancementId, Submission, Feedback, Timestamp, FeedbackText) " +
                "VALUES " +
                "(:taskId, :enhancementId, :submission, :feedback, :timestamp, :feedbackText)")
        void insertLogEntry(
                @Bind("taskId") int taskId,
                @Bind("enhancementId") String enhancementId,
                @Bind("submission") String submission,
                @Bind("feedback") String feedback,
                @Bind("timestamp") Date timestamp,
                @Bind("feedbackText") String feedbackText
        );

        @SqlUpdate("REPLACE INTO Performance " +
                "(TaskId, EnhancementId, CorrectAnswer, NumberOfTries, UsedSolution, Sentence, Feedback) " +
                "VALUES " +
                "(:taskId, :enhancementId, :correctAnswer, :numberOfTries, :usedSolution, :sentence, :feedback)")
        void updateTaskPerformance(
                @Bind("taskId") int taskId,
                @Bind("enhancementId") String enhancementId,
                @Bind("correctAnswer") String correctAnswer,
                @Bind("feedback") String feedback,
                @Bind("numberOfTries") int numberOfTries,
                @Bind("sentence") String sentence,
                @Bind("usedSolution") boolean usedSolution
        );

        @Transaction
        default void updateProgress(Submission logEntry, TaskPerformance taskPerformance) {
            insertLogEntry(
                    logEntry.task().taskId(),
                    logEntry.enhancementId(),
                    logEntry.submission(),
                    logEntry.feedback().name(),
                    logEntry.timestamp(),
                    logEntry.feedbackText()
            );

            updateTaskPerformance(
                    taskPerformance.task().taskId(),
                    taskPerformance.enhancementId(),
                    taskPerformance.correctAnswer(),
                    taskPerformance.feedback().name(),
                    taskPerformance.numberOfTries(),
                    taskPerformance.sentence(),
                    taskPerformance.usedSolution()
            );
        }
    }
}
