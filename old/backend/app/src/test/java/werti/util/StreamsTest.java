package werti.util;

import com.google.common.collect.ImmutableList;
import org.junit.Test;

import java.util.Collection;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.Assert.assertTrue;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-28
 */
public class StreamsTest {
    private final List<Integer> l0 = ImmutableList.of(1,2,3,4);
    private final List<Integer> l1 = ImmutableList.of(2,5,1);
    private final List<Integer> l2 = ImmutableList.of(5,9,10,21,99,0,2,1);
    private final List<Integer> l3 = ImmutableList.of();

    @Test
    public void intersectionWorks() throws Exception {
        final Collection<Integer> intersection = Streams.intersect(Stream.of(l0, l1, l2));
        assertTrue(
                "Intersection of l0-l2 contains just 1, 2, but contains " + intersection.toString(),
                intersection.containsAll(ImmutableList.of(1, 2)) && intersection.size() == 2
        );
    }

    @Test
    public void emptyCollectionOnEmptyElement() {
        assertTrue(
                "Intersection with empty list should always be empty",
                Streams.intersect(Stream.of(l1, l2, l3)).isEmpty()
        );
    }

    @Test
    public void emptyCollectionOnEmptyStream() {
        assertTrue(
                "Intersection of empty stream doesn't fail",
                Streams.intersect(Stream.of()).isEmpty()
        );
    }
}
