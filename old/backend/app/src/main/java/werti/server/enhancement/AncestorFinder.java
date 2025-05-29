package werti.server.enhancement;

import org.jsoup.nodes.Node;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-05
 */
class AncestorFinder {
    private final List<? extends Node> nodes;
    private final List<Node> ancestorsChildren;

    AncestorFinder(final List<? extends Node> nodes) {
        if (nodes.isEmpty()) {
            throw new IllegalArgumentException("Can't find ancestors of no nodes at all!");
        }
        this.nodes = nodes;
        this.ancestorsChildren = new ArrayList<>(nodes.size());
    }

    Node getCommonAncestor() {
        return getDirectDescendantsOfCommonAncestor().get(0).parent();
    }

    List<Node> getDirectDescendantsOfCommonAncestor() {
        if (ancestorsChildren.isEmpty()) {
            seekAncestor();
        }
        return ancestorsChildren;
    }

    private void seekAncestor() {
        // special case: there is just one node to find the ancestor of
        if (nodes.size() == 1) {
            ancestorsChildren.add(nodes.get(0));
            return;
        }

        // seed ancestor lists.
        final List<List<Node>> ancestorLists =
                nodes.stream().map(this::getAllParents).collect(Collectors.toList());
        for (int i = 0; ; i++) {
            final LinkedHashSet<Node> nodesOnThisLevel = new LinkedHashSet<>(nodes.size());
            for(List<Node> ancestors : ancestorLists) {
                nodesOnThisLevel.add(ancestors.get(i));
            }
            if (nodesOnThisLevel.size() > 1) {
                ancestorsChildren.addAll(nodesOnThisLevel);
                break;
            }
        }
    }

    // It'd be nice to use Element#parents() but we have Nodes, not elements.
    private List<Node> getAllParents(Node node) {
        Node ancestor = node;
        final List<Node> ancestors = new ArrayList<>();
        // we assume there is at least one parent. TextNodes can't be naked in the DOM
        // anyway, so that assumption seems valid. Note that we'll get an NPE if it is
        // violated.
        do {
            ancestors.add(ancestor);
            ancestor = ancestor.parent();
        } while (ancestor != null);
        Collections.reverse(ancestors);
        return ancestors;
    }
}
