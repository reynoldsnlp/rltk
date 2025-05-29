package werti.util;

/**
 * This class represents a ViewEnhancementTag consisting out of
 * the viewenhancement start tag with possibility to add attributes to
 * the viewenhancement tag and the viewenhancement end tag. It is the
 * viewenhancement tag surrounding the token that is being enhanced.
 *
 * @author Eduard Schaf
 * @since 14.12.16 *
 */
public class ViewEnhancementTag{
    private String tagStart;
    private String tagEnd;

    public ViewEnhancementTag(String tagStart) {
        this.tagStart = tagStart;
        this.tagEnd = "</viewenhancement>";
    }

    public String getTagStart() {
        return tagStart;
    }

    public void addAttribute(String attributeName, String attributeValue) {
        this.tagStart = this.tagStart.replace(">", " " + attributeName + "=\"" + attributeValue + "\">");
    }

    public String getTagEnd() {
        return tagEnd;
    }

    @Override
    public String toString() {
        return "ViewEnhancementTag{" +
                "tagStart='" + tagStart + '\'' +
                ", tagEnd='" + tagEnd + '\'' +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }

        ViewEnhancementTag that = (ViewEnhancementTag) o;

        return tagStart.equals(that.tagStart) && tagEnd.equals(that.tagEnd);
    }

    @Override
    public int hashCode() {
        int result = tagStart.hashCode();
        result = 31 * result + tagEnd.hashCode();
        return result;
    }
}