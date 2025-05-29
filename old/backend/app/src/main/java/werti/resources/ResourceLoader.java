package werti.resources;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-08
 */
@FunctionalInterface
public interface ResourceLoader<I, R> {
    R load(I resource) throws NoResourceException;
}
