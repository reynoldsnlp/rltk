package werti.server.support;

import org.apache.commons.io.FileUtils;
import org.junit.rules.ExternalResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.function.Function;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-24
 */
public class FileResource extends ExternalResource {
    private final Path resourcePath;

    public FileResource(String path) {
        this(Paths.get("src/test/resources/" + path));
    }

    private FileResource(Path path) {
        this.resourcePath = path;
    }

    public <T> T withStream(Function<InputStream, T> f) throws IOException {
        try (InputStream stream = Files.newInputStream(resourcePath)) {
            return f.apply(stream);
        }
    }

    public String slurp() throws IOException {
        return FileUtils.readFileToString(resourcePath.toFile());
    }

    @Override
    protected void before() throws Throwable {
        // ensure file exists and is readable.
        if (!(Files.exists(resourcePath) && Files.isReadable(resourcePath))) {
            throw new IOException("Path " + resourcePath.toString() + " not readable.");
        }
    }
}
