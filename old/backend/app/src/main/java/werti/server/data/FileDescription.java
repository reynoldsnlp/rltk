package werti.server.data;

import com.google.gson.annotations.Expose;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-15
 */
public class FileDescription implements Description {
    private final String description;
    private final String title;

    // Read during serialization to JSON
    @Expose private final Path file;

    public FileDescription(final String title, final Path file) throws IOException {
        this.title = title;
        this.file = file;
        this.description = new String(Files.readAllBytes(file));
    }

    public Path getFile() {
        return file;
    }

    @Override
    public String getTitle() { return title; }

    @Override
    public String getDescription() {
        return description;
    }

    @Override
    public int hashCode() {
        // We ignore description, because FileDescription only cares about which file it points to.
        // Generally, we don't expect activity/topic files to change over the runtime of app.
        return this.file.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return obj instanceof FileDescription && this.hashCode() == obj.hashCode();
    }
}
