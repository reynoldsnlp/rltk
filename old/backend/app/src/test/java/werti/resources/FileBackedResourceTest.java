package werti.resources;

import com.google.common.cache.CacheBuilder;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.ViewContext;
import werti.server.ViewTestContext;

import java.io.IOException;
import java.io.ObjectOutputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.hamcrest.MatcherAssert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-09-9
 */
public class FileBackedResourceTest {
    private Path testLocation;
    private ViewContext viewContext;

    @Before
    public void writeTestModel() throws Exception {
        viewContext = ViewTestContext.createTestContext();
        viewContext.override("test.en", "test.object");
        viewContext.override("resources.base", "");
        testLocation = viewContext.getResourcePath("test", Language.ENGLISH);
        final String model = "Test string for " + Language.ENGLISH.toString();
        try (OutputStream outStream = Files.newOutputStream(testLocation);
             ObjectOutputStream out = new ObjectOutputStream(outStream)) {
            out.writeObject(model);
        }
    }

    @After
    public void removeTestModel() throws IOException {
        Files.delete(testLocation);
    }

    @Test
    public void request() throws Exception {
        final FileBackedResource resource = new FileBackedResource(
                "test", CacheBuilder.newBuilder().build(), viewContext
        );

        final String test = resource.request(
                Language.ENGLISH,
                object -> (String) object,
                String.class
        );

        Assert.assertEquals(
                "Serialized object correctly loaded.",
                test,
                "Test string for en"
        );

        final String test2 = resource.request(
                Language.ENGLISH,
                object -> { throw new RuntimeException("The second request should be cached!"); },
                String.class
        );

        assertThat(
                "First and second call should be object-identical",
                // String comparison with == is on purpose
                test2 == test
        );
    }
}
