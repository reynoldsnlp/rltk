package werti;

import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

import java.io.File;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.junit.Assert.assertTrue;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-09-11
 */
public class ViewContextTest {
    private final Properties testProperties = new Properties();
    @Rule public TemporaryFolder testRoot = new TemporaryFolder();
    private ViewContext viewContext;

    @Before
    public void setUp() throws Exception {
        final Path temporaryFile = testRoot.newFile("VIEW.properties").toPath();
        testProperties.put("resources.base", "modelBasePath");
        testProperties.put("test.en", "test-model");
        testProperties.put("test-property", "test-value");
        testProperties.put("test-unicode", "АБВ ÄÖÜ Øłą 漢語");

        try (Writer out = Files.newBufferedWriter(temporaryFile)) {
            testProperties.store(out, "Test Properties");
        }
        testRoot.newFolder("private");
        testRoot.newFile("private/local.properties");

        viewContext = new ViewContext(testRoot.getRoot().toPath());
    }

    // Attention: this test doesn't use the properties file created above in setUp(), because
    // it needs to test ViewContext creation in the server, which happens in its own mysterious
    // ways; see ServletContext#getResource().
    @Test
    public void canLoadViewPropretiesFromServletContext() throws Exception {
        // Write local files in testRoot/WEB-INF/classes/{VIEW.properties,local.properties}
        final File classesFolder = new File(testRoot.getRoot(), "WEB-INF/classes");
        assertTrue(
                "Should create 'WEB-INF/classes'",
                classesFolder.mkdirs()
        );

        final File privateFolder = new File(testRoot.getRoot(), "WEB-INF/classes/private");
        assertTrue(
                "Should create 'WEB-INF/classe/private",
                privateFolder.mkdirs()
        );

        final File globalFile = new File(classesFolder, "VIEW.properties");
        final File localFile = new File(privateFolder, "local.properties");

        final Properties globalProperties = new Properties();
        final Properties localProperties = new Properties();

        globalProperties.put("global", "test");
        localProperties.put("local", "also test");

        assertTrue(
                "Should create both VIEW.properties and local.properties",
                globalFile.createNewFile() && localFile.createNewFile()
        );

        try (
                Writer globalWriter = Files.newBufferedWriter(globalFile.toPath());
                Writer localWriter  = Files.newBufferedWriter(localFile.toPath())
        ) {
            globalProperties.store(globalWriter, "global properties");
            localProperties.store(localWriter, "local properties");
        }

        // Start a new server with servlet context in testRoot
        final Server server = new Server(45093);
        final ServletContextHandler servletContextHandler = new ServletContextHandler(
                server, "/", ServletContextHandler.SESSIONS
        );
        final String absoluteRoot = testRoot.getRoot().getAbsolutePath();
        servletContextHandler.setResourceBase(absoluteRoot);

        // Create context from server we just created
        final ViewContext myContext = new ViewContext(servletContextHandler.getServletContext());

        assertThat(
                "Global properties should store test key",
                myContext.getProperty("global"),
                is("test")
        );

        assertThat(
                "Local properties should store test key",
                myContext.getProperty("local"),
                is("also test")
        );
    }

    @Test
    public void getProperty() throws Exception {
        Assert.assertEquals(
                "Stored test-property is as expected.",
                "test-value",
                viewContext.getProperty("test-property")
        );

        Assert.assertEquals(
                "Unicode-values work",
                "АБВ ÄÖÜ Øłą 漢語",
                viewContext.getProperty("test-unicode")
        );

        Assert.assertNull(
                "Unknown property is null",
                viewContext.getProperty("not-a-valid-property")
        );
    }

    @Test
    public void getOrDefault() throws Exception {
        Assert.assertEquals(
                "Unknown property uses default value",
                "defaultValue",
                viewContext.getOrDefault("not-a-valid-property", "defaultValue")
        );
    }

    @Test
    public void getResourcePath() throws Exception {
        final Path modelPath = viewContext.getResourcePath("test", Language.ENGLISH);
        assertTrue(
                "Model path ends with the correct relative part",
                modelPath.endsWith("modelBasePath/test-model")
        );
    }

    @Test
    public void resolve() throws Exception {
        assertTrue(
                "Resolve works correctly",
                viewContext.resolve("foo").endsWith("foo")
        );
    }

    @Test
    public void overrideProperties() throws Exception {
        final Properties overrides = new Properties();
        overrides.put("test-property", "newTestValue");
        viewContext.overrideProperties(overrides);

        Assert.assertEquals(
                "Overridden property has correct value",
                "newTestValue",
                viewContext.getProperty("test-property")
        );
    }
}
