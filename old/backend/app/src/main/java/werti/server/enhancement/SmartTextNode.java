package werti.server.enhancement;

import com.google.auto.value.AutoValue;
import org.jsoup.nodes.TextNode;

/**
 * {@link org.jsoup.nodes.TextNode} adapter.
 * @author Aleksandar Dimitrov
 * @since 2016-11-08
 */
@AutoValue
abstract class SmartTextNode {
    abstract TextNode textNode();
    abstract Span span();

    public static SmartTextNode create(TextNode textNode, final int start) {
        return create(textNode, Span.create(start, start + textNode.getWholeText().length()));
    }

    public static SmartTextNode create(TextNode textNode, Span span) {
        return new AutoValue_SmartTextNode(textNode, span);
    }

    public void before(SmartTextNode node) {
        textNode().before(node.textNode());
    }

    public void after(SmartTextNode node) {
        textNode().after(node.textNode());
    }

    boolean isContainedOrEquals(final Span someSpan) {
        final Span.Relationship relationship = Span.compare(someSpan, span());
        return relationship == Span.Relationship.CONTAINS
            || relationship == Span.Relationship.EQUALS;
    }
}
