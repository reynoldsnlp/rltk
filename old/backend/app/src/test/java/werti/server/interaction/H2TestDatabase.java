package werti.server.interaction;

import org.h2.jdbcx.JdbcDataSource;
import werti.endtoend.topics.TestTopics;
import werti.server.analysis.ViewRequestException;
import werti.server.data.Topics;
import werti.server.interaction.authentication.TestAuthenticationService;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.Task;
import werti.server.interaction.data.WebPage;
import werti.server.interaction.storage.H2StorageEngine;
import werti.server.interaction.storage.StorageEngine;

import java.math.BigInteger;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Date;
import java.util.Random;

/**
 * Storage engine for tests, creates an in-memory database.
 * Create in <tt>@Before</tt>, and don't forget to call {@link StorageEngine#close()}
 * in <tt>@After</tt>.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-02-19
 */
public class H2TestDatabase {
    private static final Random random = new Random();
    private final H2StorageEngine storageEngine;
    private final Topics topics;

    public H2TestDatabase() throws Exception {
        final String name = new BigInteger(32, random).toString(26);

        final JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setUrl("jdbc:h2:mem:" + name);
        dataSource.setUser("test");
        dataSource.setPassword("test");

        topics = TestTopics.getMockTopics();

        storageEngine = new H2StorageEngine(dataSource, topics);
    }

    public H2StorageEngine getTestDatabase() {
        return storageEngine;
    }

    /**
     * Creates a new user.
     *
     * @return A new user
     */
    public User newUser() {
        return TestAuthenticationService.createTestUser();
    }

    /**
     * Creates a new task for <tt>user</tt>.
     *
     * @param user The user
     * @return A new task, which is stored in the database
     */
    public Task newTaskFor(final User user) throws ViewRequestException, MalformedURLException {
        return storageEngine.getTaskStorage().store(
                topics.getTaskData("en", "articles", "color", "any"),
                99,
                WebPage.create(new URL("http://example.com"), "test page"),
                user,
                new Date()
        );
    }

    /**
     * Creates a new russian task for <tt>user</tt>.
     *
     * @param user The user
     * @return A new task, which is stored in the database
     */
    public Task newRussianTaskFor(final User user) throws ViewRequestException, MalformedURLException {
        return storageEngine.getTaskStorage().store(
                topics.getTaskData("ru","nouns","color", "all"),
                99,
                WebPage.create(new URL("http://example.com"), "test page"),
                user,
                new Date()
        );
    }
}
