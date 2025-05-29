package werti.server.enhancement;

import com.google.common.collect.ImmutableList;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;

import java.util.*;
import java.util.stream.Collectors;

/**
 * The <tt>TextNodeEnhancer</tt>'s role is to insert <tt>{@link Element}</tt>s into
 * the DOM at arbitrary positions in the text.
 * It depends on a correctly filled <tt>{@link TextNodeRegistry}</tt> which indexes the
 * plain text positions in the DOM to the DOM's actual <tt>{@link TextNode}</tt>s.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-11-08
 */
class TextNodeEnhancer {
    private final TextNodeRegistry textNodeRegistry;
    private static final Logger log = LogManager.getLogger();

    TextNodeEnhancer(final TextNodeRegistry textNodeRegistry) {
        this.textNodeRegistry = textNodeRegistry;
    }

    void addEnhancement(final Span span, final Element element) {
        final List<SmartTextNode> coveredNodes = textNodeRegistry.query(span);
        if (coveredNodes.isEmpty()) {
            log.error("Couldn't find a registered span for {}, element {}. Ignoring.", span, element);
            return;
        }

        final List<SmartTextNode> nodesUnderEnhancement = getNodesUnderEnhancement(coveredNodes, span);

        final List<Node> directDescendantsOfJoin = new AncestorFinder(
                nodesUnderEnhancement.stream().map(SmartTextNode::textNode).collect(Collectors.toList())
        ).getDirectDescendantsOfCommonAncestor();
        if (containsOtherText(directDescendantsOfJoin, nodesUnderEnhancement)) {
            findLargestNodeToInsert(nodesUnderEnhancement, element);
        } else {
            wrap(directDescendantsOfJoin, element);
        }
    }

    /**
     * Does the given list of <tt>Node</tt>s contain any <tt>TextNode</tt> which is not present in the given list of
     * <tt>SmartTextNode</tt>s?
     *
     * Helps to find out if projecting over the given <tt>Node</tt>s would be too eager, and include material
     * the annotation was not meant to include.
     *
     * <b>Important precondition:</b> We assume that both lists are in order.
     *
     * @param nodeList Parent elements
     * @param nodesUnderEnhancement Text nodes
     * @return True if there is a <tt>TextNode</tt> under the parent elements that was not in the
     * <tt>nodesUnderEnhancement</tt>.
     */
    private boolean containsOtherText(
            List<Node> nodeList,
            List<SmartTextNode> nodesUnderEnhancement
    ) {
        final List<TextNode> textNodes = getTextNodes(nodeList);
        final String nodeListText = textNodes.stream().map(TextNode::text).collect(Collectors.joining());
        final String textUnderEnhancement = nodesUnderEnhancement.stream().map(smartTextNode -> smartTextNode
                .textNode().text()).collect(Collectors.joining());
        return !nodeListText.equals(textUnderEnhancement);
    }

    private List<TextNode> getTextNodes(List<Node> nodeList) {
        final List<TextNode> textNodes = new ArrayList<>();
        for (Node node : nodeList) {
            if (node instanceof TextNode) {
                textNodes.add((TextNode) node);
            } else if (node instanceof Element) {
                textNodes.addAll(new TextNodeFilter((Element) node).apply());
            }
        }
        return textNodes;
    }

    private void findLargestNodeToInsert(
            final List<SmartTextNode> nodesUnderEnhancement,
            final Element element
    ) {
        nodesUnderEnhancement.sort(Comparator.comparingInt(
                smartTextNode -> smartTextNode.span().range()
        ));

        final SmartTextNode largestNode = nodesUnderEnhancement.get(nodesUnderEnhancement.size() - 1);
        wrap(ImmutableList.of(largestNode.textNode()), element);
    }

    /**
     * Optionally chops the first and last <tt>TextNode</tt>s into pieces, if they are longer
     * than the given span, i.e. if the enhancement we want to place starts or ends in the middle
     * of a <tt>TextNode</tt>.
     *
     * This method will create new <tt>TextNodes</tt> in the DOM, if the span only partially
     * coveres some <tt>TextNodes</tt>. See the documentation of {@link #chop(SmartTextNode, Span)}.
     *
     * @param coveredNodes The nodes the given span at least partially covers
     * @param span         The span covering the these nodes
     *
     * @return A list of nodes that are <i>directly subsumed</i> under the given span.
     */
    private List<SmartTextNode> getNodesUnderEnhancement(
            final List<SmartTextNode> coveredNodes,
            final Span span
    ) {
        final List<SmartTextNode> nodes = new ArrayList<>();
        final int numberOfCoveredNodes = coveredNodes.size();

        // add first node
        nodes.add(chop(coveredNodes.get(0), span));

        // add nodes in between
        if (numberOfCoveredNodes > 2) {
            nodes.addAll(
                    new ArrayList<>(coveredNodes.subList(
                            1,
                            coveredNodes.size() - 1
                    ))
            );
        }

        // add last node
        if (numberOfCoveredNodes > 1) {
            nodes.add(chop(coveredNodes.get(numberOfCoveredNodes - 1), span));
        }

        return nodes;
    }

    private Optional<Node> findValidDirectParent(final List<Node> nodes) {
        final Set<Node> parents = nodes.stream().map(Node::parent).collect(Collectors.toSet());
        if (parents.size() == 1) {
            return Optional.of(parents.iterator().next());
        } else {
            return Optional.empty();
        }
    }

    /**
     * Make burrito.
     *
     * <b>Precondition</b>: There is at least one node in the stuffing, and all
     * nodes in the stuffing have
     * a common ancestor.
     * <b>Postcondition</b>: All nodes in the stuffing will have the wrapper as
     * a common ancestor, and their former ancestor will have the wrapper as a
     * direct descendant.
     *
     * @param stuffing Elements with a common ancestor
     * @param wrapper  Element to wrap them with
     */
    private void wrap(final List<Node> stuffing, final Element wrapper) {
        final Optional<Node> parentOption = findValidDirectParent(stuffing);
        if (!parentOption.isPresent()) {
            return;
        }

        stuffing.get(0).before(wrapper);
        stuffing.forEach(node -> {
            node.remove();
            wrapper.appendChild(node);
        });
    }

    /**
     * Split a <tt>SmartTextNode</tt> into several <tt>{@link TextNode}</tt>s
     * along the edge(s) of a span. E.g. if the input node is <tt>"a b c"</tt>,
     * and the span is (2,3), return <tt>["a ", "b", " c"]</tt>.
     *
     * The new nodes are inserted into the DOM in the correct order and in the
     * position of the original node. The original node is removed from the DOM.
     *
     * @param node Input text node which is to be split.
     * @param span The span along which the node is to be split
     * @return A list of at least one and at most three new <tt>TextNode</tt>s
     *         guaranteed to contain all of the original <tt>TextNode</tt>'s
     *         content.
     */
    private SmartTextNode chop(
            final SmartTextNode node,
            final Span span
    ) {
        final TextNode textNode = node.textNode();
        final Span relativeSpan = span.intersectWith(node.span())
                                      .transpose(-node.span().begin());
        final SmartTextNode center = updateTextNode(node, relativeSpan);
        textNode.replaceWith(center.textNode());

        if (relativeSpan.begin() > 0) {
            final SmartTextNode beginning = updateTextNode(
                    node,
                    Span.create(0, relativeSpan.begin())
            );
            center.before(beginning);
        }

        final String text = textNode.getWholeText();
        if (relativeSpan.end() < text.length()) {
            final SmartTextNode end = updateTextNode(
                    node,
                    Span.create(relativeSpan.end(), text.length()));
            center.after(end);
        }

        return center;
    }

    /**
     * Create a new <tt>SmartTextNode</tt> which is contained in the given old <tt>SmartTextNode</tt>
     * as specified by the <tt>relativeSpan</tt>. The <tt>Span</tt> is relative to the beginning of the
     * text in <tt>oldNode</tt>; a node <tt>{"foobar", (10, 15)}</tt> with <tt>relativeSpan</tt>
     * <tt>(0,1)</tt> would produce a new node <tt>{"f", (10, 11)}</tt>, and update position 10 in the
     * <tt>TextNodeRegistry</tt>.
     *
     * <b>Note:</b> This method only updates the <tt>TextNodeRegistry</tt>, it does not update the DOM!
     * @param oldNode The old node from which to create a new node.
     * @param relativeSpan The substring to create a new node from.
     * @return A new <tt>SmartTextNode</tt> which contains the substring of <tt>oldNode</tt> specified
     *         by <tt>relativeSpan</tt>
     */
    private SmartTextNode updateTextNode(final SmartTextNode oldNode, final Span relativeSpan) {
        final String text = oldNode.textNode().getWholeText();
        final SmartTextNode newNode = SmartTextNode.create(
                TextNode.createFromEncoded(
                        text.substring(relativeSpan.begin(), relativeSpan.end()),
                        oldNode.textNode().baseUri()
                ),
                oldNode.span().begin() + relativeSpan.begin()
        );
        textNodeRegistry.update(newNode);
        return newNode;
    }
}
