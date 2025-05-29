package werti.server;

import com.google.gson.Gson;
import com.google.inject.Guice;
import com.google.inject.Inject;
import com.google.inject.Provider;
import com.google.inject.name.Named;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import werti.server.data.Description;
import werti.server.data.FileDescription;
import werti.server.data.StringDescription;
import werti.server.modules.TopicModule;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.Assert.assertEquals;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-15
 */
public class DescriptionTest {
    @Rule public TemporaryFolder tmp = new TemporaryFolder();
    private Path temporaryFile;

    private final String testTitle = "This is a title";
    private final String testString = "This is a description";

    @Inject @Named("view-gson") private Provider<Gson> gsonProvider;
    private Gson gson;

    @Before
    public void setUp() throws Exception {
        Guice.createInjector(new TopicModule()).injectMembers(this);
        gson = gsonProvider.get();
        temporaryFile = tmp.newFile("description.json").toPath();
    }

    @Test
    public void reserializeIdentityString() throws Exception {
        final Description description = new StringDescription(testTitle, testString);
        final String json = gson.toJson(description);
        final Description deserializedDescription = gson.fromJson(json, Description.class);
        assertEquals(
                "After serialization and de-serialization we get the correct description.",
                description.getDescription(),
                deserializedDescription.getDescription()
        );
    }

    @Test
    public void reserializeIdentityFile() throws Exception {
        Files.write(temporaryFile, testString.getBytes());
        final FileDescription description = new FileDescription(testTitle, temporaryFile);
        final String json = gson.toJson(description);
        final Description deserializedDescription = gson.fromJson(json, Description.class);
        assertEquals(
                "After serialization and deserialization the file link still works.",
                description.getDescription(),
                deserializedDescription.getDescription()
        );
    }
}
