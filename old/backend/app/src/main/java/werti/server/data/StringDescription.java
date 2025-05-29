package werti.server.data;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-15
 */
public class StringDescription implements Description {
    private final String description;
    private final String title;

    public StringDescription(final String title, final String description) {
        this.title = title;
        this.description = description;
    }

    @Override
    public String getTitle() { return title; }

    @Override
    public String getDescription() {
        return description;
    }

    @Override
    public int hashCode() {
        return description.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return obj instanceof StringDescription
                && this.hashCode() == obj.hashCode();
    }
}
