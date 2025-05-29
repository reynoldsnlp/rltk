package werti.server.modules.json;

import werti.server.data.Description;
import werti.server.data.FileDescription;
import werti.server.data.StringDescription;

import java.io.IOException;
import java.nio.file.Path;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-27
 */
public final class DescriptionBuilder {
    private String title = null;
    private String description = null;
    private Path descriptionPath = null;

    public void setTitle(final String title) {
        this.title = title;
    }

    public void setStringDescription(final String description) {
        this.description = description;
    }

    public void setDescriptionFrom(final Path path) {
        this.descriptionPath = path;
    }

    public Description build() throws DescriptionBuilderException {
        if (title == null) {
            throw new IncompleteDescriptionException("No title");
        }
        if (this.description != null) {
            return new StringDescription(this.title, this.description);
        }
        if (this.descriptionPath != null) {
            try {
                return new FileDescription(this.title, this.descriptionPath);
            } catch (IOException e) {
                throw new DescriptionBuilderException(e);
            }
        }
        throw new IncompleteDescriptionException("No description");
    }

    public class DescriptionBuilderException extends Exception {
        DescriptionBuilderException(String s) {
            super(s);
        }

        DescriptionBuilderException(Throwable e) {
            super(e);
        }
    }

    private class IncompleteDescriptionException extends DescriptionBuilderException {
        IncompleteDescriptionException(String s) {
            super(s);
        }
    }
}
