package werti.server;

import org.junit.Test;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static werti.server.enhancement.Span.Relationship.*;
import static werti.server.enhancement.Span.compare;
import static werti.server.enhancement.Span.create;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-08
 */
public class SpanTest {
    @Test
    public void equals() {
        assertThat(compare(create(0, 1), create(0, 1)), is(EQUALS));
    }

    @Test
    public void contains() {
        assertThat(compare(create(0, 1), create(0, 0)), is(CONTAINS));
        assertThat(compare(create(0, 1), create(1, 1)), is(CONTAINS));
        assertThat(compare(create(0, 2), create(0, 1)), is(CONTAINS));
    }

    @Test
    public void isContained() {
        assertThat(compare(create(0, 0), create(0, 1)), is(ISCONTAINED));
        assertThat(compare(create(1, 1), create(0, 1)), is(ISCONTAINED));
        assertThat(compare(create(0, 1), create(0, 2)), is(ISCONTAINED));
    }

    @Test
    public void isDisjoint() {
        assertThat(compare(create(0, 0), create(1, 1)), is(DISJOINT));
        assertThat(compare(create(1, 1), create(0, 0)), is(DISJOINT));
        assertThat(compare(create(1, 2), create(0, 1)), is(DISJOINT));
        assertThat(compare(create(0, 1), create(1, 2)), is(DISJOINT));
    }

    @Test
    public void overlaps() {
        assertThat(compare(create(0, 2), create(1,3)), is(OVERLAPS));
        assertThat(compare(create(1, 3), create(0,2)), is(OVERLAPS));
    }

    @Test
    public void testIntersection() {
        assertThat(create(0,1).intersectWith(create(1,2)), is(create(1,1)));
        assertThat(create(0,2).intersectWith(create(1,2)), is(create(1,2)));
        assertThat(create(0,2).intersectWith(create(1,3)), is(create(1,2)));

        assertThat(create(1,2).intersectWith(create(0,2)), is(create(1,2)));
    }

    @Test
    public void isCorrectSpan() {
        assertThat(create(1,0), is(create(0,1)));
    }
}

// quickcheck would've been so much more useful here…
