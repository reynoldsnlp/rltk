package werti.server.enhancement;

import com.google.auto.value.AutoValue;
import org.apache.uima.jcas.tcas.Annotation;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-08
 */
@AutoValue
public abstract class Span {
    public abstract int begin();
    public abstract int end();

    public static Span create(int begin, int end) {
        if (end < begin) {
            return new AutoValue_Span(end, begin);
        }
        return new AutoValue_Span(begin, end);
    }

    public int range() {
        return end() - begin();
    }

    public Span transpose(final int offset) {
        return create(begin() + offset, end() + offset);
    }

    public static Relationship compare(final Span s0, final Span s1) {
        if (s0.begin() == s1.begin() && s0.end() == s1.end()) {
            return Relationship.EQUALS;
        }
        if (s0.begin() <= s1.begin() && s0.end() >= s1.end()) {
            return Relationship.CONTAINS;
        }
        if (s0.begin() >= s1.begin() && s0.end() <= s1.end()) {
            return Relationship.ISCONTAINED;
        }
        if (s0.begin() < s1.begin() && s0.end() < s1.end() && s0.end() > s1.begin()
         || s0.begin() > s1.begin() && s0.end() > s1.end() && s0.begin() < s1.end()) {
            return Relationship.OVERLAPS;
        }
        return Relationship.DISJOINT;
    }

    public static Span span(Annotation annotation) {
        return create(annotation.getBegin(), annotation.getEnd());
    }

    public Span intersectWith(Span otherSpan) {
        final int begin = Integer.compare(begin(), otherSpan.begin()) < 0 ? otherSpan.begin() : begin();
        final int end   = Integer.compare(end(),   otherSpan.end())   > 0 ? otherSpan.end()   : end();

        return create(begin, end);
    }

    public static enum Relationship {
        DISJOINT, CONTAINS, ISCONTAINED, OVERLAPS, EQUALS
    }
}
