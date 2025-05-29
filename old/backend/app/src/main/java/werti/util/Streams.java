package werti.util;

import java.util.*;
import java.util.function.BinaryOperator;
import java.util.function.Supplier;
import java.util.stream.Stream;

/**
 * Utility static methods for operations on streams.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-16
 */
public class Streams {

	private Streams() { /* No instantiation */}

	/**
     * Binary operator usable as a guard in .reduce() operations on streams.
	 * It will reduce any two elements to an {@link IllegalArgumentException}.
     * If the stream contains only one element, nothing happens, and processing
	 * may continue.
	 *
	 * Use {@link #toOnlyElementThrowing(Supplier)} to customize the exception
	 * thrown.
     * @see <a href="http://blog.codefx.org/java/stream-findfirst-findany-reduce/">Source</a>
	 * @param <T> The return type
	 * @return The stream intact, iff it contains only one element.
	 */
	public static <T> BinaryOperator<T> toOnlyElement() {
		return toOnlyElementThrowing(IllegalArgumentException::new);
	}

	/**
     * @see #toOnlyElement()
	 * @see <a href="http://blog.codefx.org/java/stream-findfirst-findany-reduce/">Source</a>
	 * @param exception The exception you want thrown in case there is more
	 *                  than one element.
	 * @param <T> The return type
	 * @param <E> The exception type
	 * @return The stream intact, iff it contains only one element.
	 */
	public static <T, E extends RuntimeException> BinaryOperator<T>
	toOnlyElementThrowing(Supplier<E> exception) {
		return (element, otherElement) -> {
			throw exception.get();
		};
	}

    /**
     * Given a stream of lists, intersect it.
     *
     * @param stream A stream of collections you want to intersect
     * @param <T> Any item that has a decent .equals(). Seriously, don't attempt this without a working .equals().
     * @return The unique! elements present in *all* collections in the stream
     */
    public static <T> Collection<T> intersect(Stream<Collection<T>> stream) {
        // Optimization: sorting by size so that the biggest constrainer
        // (smallest collection) comes first
        final Iterator<Collection<T>> allLists = stream.sorted(
				Comparator.comparingInt(Collection::size)
        ).iterator();

        if (!allLists.hasNext()) {
            return Collections.emptySet();
        }

        final Set<T> result = new HashSet<>(allLists.next());
        while(allLists.hasNext()) {
			result.retainAll(allLists.next());
		}
		return result;
	}
}
