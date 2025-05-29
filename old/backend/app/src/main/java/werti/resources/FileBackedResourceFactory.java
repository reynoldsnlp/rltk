package werti.resources;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-08
 */
@FunctionalInterface
public interface FileBackedResourceFactory {
    FileBackedResource create(String resourceProperty);
}
