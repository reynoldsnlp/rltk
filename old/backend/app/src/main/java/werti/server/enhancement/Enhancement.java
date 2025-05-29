package werti.server.enhancement;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import com.google.gson.Gson;
import org.apache.uima.jcas.tcas.Annotation;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import werti.uima.ConvenientCas;
import werti.uima.types.EnhancementAnnotation;

import javax.annotation.Nullable;
import java.util.*;
import java.util.function.BiFunction;
import java.util.stream.Collectors;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-13
 */
public abstract class Enhancement {
    private final Map<String, List<String>> attributes;
    private final int startPosition;
    private final int endPosition;
    protected static final Gson gson = new Gson();

    public Enhancement(final int begin, final int end) {
        attributes = new HashMap<>();
        startPosition = begin;
        endPosition = end;
    }

    public Enhancement(final Span span) {
        this(span.begin(), span.end());
    }

    public Enhancement(final Annotation annotation) {
        this(Span.span(annotation));
        attributes.put("original-text", ImmutableList.of(getOriginalText(annotation)));
    }

    private String getOriginalText(final Annotation annotation) {
        final String fullText = annotation.getCoveredText();
        return fullText.replaceAll("\\p{P}", "");
    }

    protected abstract String getTagName();

    public final Element createElement(final Document document) {
        final Element element = document.createElement(getTagName());
        getAllAttributes().forEach(
                attribute -> element.attr("data-" + attribute.key(), attribute.value())
        );
        return element;
    }

    public Span getSpan() {
        return Span.create(startPosition, endPosition);
    }

    public Optional<String> getAttribute(final String key) {
        return Optional.ofNullable(attributes.get(key))
                       .map(this::concatenate);
    }

    private String concatenate(List<String> set) {
        return set.stream().collect(Collectors.joining(" "));
    }

    public Enhancement addAllAttributes(final Map<String, List<String>> newAttributes) {
        attributes.putAll(newAttributes);
        return this;
    }

    /**
     * Add an attribute. If the value or key are <tt>null</tt>, no attribute is added.
     * See {@link Map#merge(Object, Object, BiFunction)} for details about the exact behaviour.
     *
     * @param key The key of the attribute
     * @param value The value of the attribute
     * @return self
     */
    public Enhancement addAttribute(@Nullable final String key, @Nullable final String value) {
        if (value == null) {
            return this;
        }

        attributes.merge(
                key,
                Lists.newArrayList(value),
                (s0, s1) -> { s0.addAll(s1); return s0; }
        );
        return this;
    }

    public Set<EnhancementAttribute> getAllAttributes() {
        return attributes.entrySet().stream().map(
                entry -> EnhancementAttribute.create(entry.getKey(), concatenate(entry.getValue()))
        ).collect(Collectors.toSet());
    }

    public Enhancement addToCas(ConvenientCas cas) {
        final EnhancementAnnotation annotation =
                cas.createAnnotation(startPosition, endPosition, EnhancementAnnotation.class);
        annotation.setData(getData());
        annotation.addToIndexes();
        return this;
    }

    public String getData() {
        return gson.toJson(attributes);
    }

    @Override
    public int hashCode() {
        return Objects.hash(startPosition, endPosition, attributes);
    }

    @Override
    public boolean equals(Object obj) {
        if (obj instanceof Enhancement) {
            final Enhancement other = (Enhancement) obj;
            return other.startPosition == this.startPosition
                    && other.endPosition == this.endPosition
                    && other.attributes.equals(this.attributes);
        }
        return false;
    }

    @Override
    public String toString() {
        final String attributes = getAllAttributes()
                .stream().map(EnhancementAttribute::toString)
                .collect(Collectors.joining(" "));

        return "<" + getTagName() + " (" + startPosition + "-" + endPosition + ") " + attributes +
                ">";
    }
}
