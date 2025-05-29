package werti;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import javax.annotation.Nullable;
import javax.servlet.ServletContext;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

/**
 * VIEWContext manages the application's environment and settings. It is responsible
 * for finding and reading the configuration from VIEW.properties, which should point
 * to the paths for all ML-models, annotator settings (like encodings) and external
 * binaries.
 *
 * @author Aleksandar Dimitrov
 * @since  2016-09-08
 */
public class ViewContext {
    private static final Logger log = LogManager.getLogger();

    private final Path appBasePath;
    private final Properties properties;
    private static final String VIEW_PROPERTIES = "VIEW.properties";
    private static final String VIEW_OVERRIDES = "private/local.properties";

    /**
     * Instantiate VIEW from a ServletContext, reading in the configuration files.
     *
     * @param context The context from which to load the files <tt>VIEW.properties</tt> and <tt>local.properties</tt>
     * @throws ViewContextException If we can't read <tt>VIEW.properties</tt>
     */
    public ViewContext(final ServletContext context) throws ViewContextException {
        properties = loadProperties(VIEW_PROPERTIES, context);

        try {
            properties.putAll(loadProperties(VIEW_OVERRIDES, context));
        } catch (ViewContextException e) {
            log.warn("Couldn't read local properties, running with defaults.", e);
        }

        final String realPath = context.getRealPath("");
        appBasePath = FileSystems.getDefault().getPath(realPath);
    }

    /**
     * Instantiate <tt>ViewContext</tt> from a <tt>{@link Path}</tt>, where the files
     * <tt>VIEW.properties</tt> and, optionally, <tt>local.properties</tt> should exist.
     *
     * Used only for testing purposes.
     *
     * @param path A path where at least <tt>VIEW.properties resides</tt>
     * @throws ViewContextException If we can't read <tt>VIEW.properties</tt> or the system property
     * <tt>user.dir</tt> is not set, which prevents us from determining the App's base path.
     */
    public ViewContext(final Path path) throws ViewContextException {
        try {
            properties = loadProperties(VIEW_PROPERTIES, path);
        } catch (IOException e) {
            throw new ViewContextException(e);
        }

        try {
            properties.putAll(loadProperties(VIEW_OVERRIDES, path));
        } catch (IOException e) {
            log.trace("Couldn't read local properties, running with defaults.", e);
        }

        final String userDir = System.getProperty("user.dir");
        if (userDir != null) {
            appBasePath = FileSystems.getDefault().getPath(userDir);
        } else {
            throw new ViewContextException("Couldn't determine app base directory");
        }
    }

    /**
     * Query VIEWContext's properties.
     *
     * @see Properties#getProperty(String)
     * @param key The key to the property.
     * @return The value of the property, or null, if the property couldn't be found.
     */
    @Nullable
    public String getProperty(String key) {
        return properties.getProperty(key);
    }

    /**
     * Query VIEWContext's properties with a default value.
     *
     * @see Properties#getOrDefault(Object, Object)
     * @param key The key to the property.
     * @param defaultValue The default value, returned when the key is not present.
     * @return The value of the property, or null, if the property couldn't be found.
     */
    public String getOrDefault(String key, String defaultValue) {
        return properties.getOrDefault(key, defaultValue).toString();
    }

    /**
     * Retrieve a given resource file's location.
     *
     * @param resourceName The property key of the resource you want to retrieve
     * @param language The language to get the resource for
     * @return The path to where the resource should be, according to properties.
     *         Or <tt>null</tt> if the property is not defined.
     */
    public Path getResourcePath(String resourceName, Language language) {
        final String key = resourceName + "." + language.toString();
        final String resourceLocation = getProperty(key);
        if (resourceLocation == null) {
            return null;
        }
        return getResourceBasePath().resolve(resourceLocation);
    }

    private Path getResourceBasePath() {
        return resolve(getProperty("resources.base"));
    }

    /**
     * Resolve a path relative to app base path. Note: this uses {@link Path#resolve(Path)},
     * if you pass it an absolute path, you'll get the path you passed, but this is not
     * an error.
     *
     * @see Path#resolve(Path)
     * @param path (relative) path to resolve.
     * @return A path resolved relative to app's base path
     */
    public Path resolve(final Path path) {
        return appBasePath.resolve(path);
    }

    /**
     * Like {@link #resolve(Path)}, but first converts <code>String</code> to {@link Path}.
     *
     * @see #resolve(Path)
     * @param path (relative) path to resolve.
     * @return A path resolved relative to app's base path
     */
    public Path resolve(final String path) {
        return appBasePath.resolve(path);
    }

    /**
     * Override properties given in VIEWContext's properties.
     * @param overrides The new properties.
     */
    void overrideProperties(Properties overrides) {
        properties.putAll(overrides);
    }

    /**
     * Override a single property in this <tt>ViewContext</tt> instance.
     * @param key The property key
     * @param value The property value
     */
    public void override(final String key, final String value) {
        properties.put(key, value);
    }

    private Properties loadProperties(final String file, final Path basePath) throws IOException {
        final Properties myProperties = new Properties();
        final Path filePath = basePath.resolve(file);
        try (InputStreamReader propertyReader =
                     new InputStreamReader(Files.newInputStream(filePath), "UTF-8")) {
            myProperties.load(propertyReader);
        }
        return myProperties;
    }

    private Properties loadProperties(
            final String file,
            final ServletContext servletContext
    ) throws ViewContextException {
        // See ServletContext#getResource() for why we're prepending "/WEB-INF/classes", also the
        // ServletContext test in ViewContextTest.
        try (InputStream inputStream = servletContext.getResourceAsStream("/WEB-INF/classes/" + file);
             InputStreamReader propertyReader = new InputStreamReader(inputStream, "UTF-8")) {
            final Properties myProperties = new Properties();
            myProperties.load(propertyReader);
            return myProperties;
        } catch (IOException | NullPointerException e) {
            throw new ViewContextException(e);
        }
    }
}
