package werti.server.enhancement;

import org.jsoup.nodes.TextNode;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-08
 */
class TextNodeRegistry {
    private final SmartTextNode[] textNodeIndex;

    TextNodeRegistry(final int textLength) {
        textNodeIndex = new SmartTextNode[textLength];
    }

    public TextNodeRegistry register(final int startingAt, List<TextNode> textNodes) {
        int currentPosition = startingAt;
        for (TextNode textNode : textNodes) {
            final SmartTextNode wrapper = SmartTextNode.create(textNode, currentPosition);
            currentPosition = registerOne(wrapper);
        }
        return this;
    }

    int registerOne(SmartTextNode textNode) {
        int i = textNode.span().begin();
        final int end = textNode.span().end();
        for (; i < end; i++) {
            textNodeIndex[i] = textNode;
        }
        return i;
    }

    public List<SmartTextNode> query(Span span) {
        final Set<SmartTextNode> textNodes = new LinkedHashSet<>();
        textNodes.addAll(Arrays.asList(textNodeIndex).subList(span.begin(), span.end()));
        return textNodes.stream().collect(Collectors.toList());
    }

    public void update(SmartTextNode newNode) {
        registerOne(
                SmartTextNode.create(newNode.textNode(), newNode.span().begin())
        );
    }
}
