package werti.tracking;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

import org.apache.commons.lang.StringEscapeUtils;

/**
 * Java representation of a row in a database table.
 * 
 * Subclasses should also implement a method
 * <code>public static List&lt;DataSubclass&gt; parseFromSQLResult(ResultSet)</code>
 */
public abstract class Data {

    public abstract String toSQLValueListString();

    public static List<? extends Data> parseFromSQLResult(ResultSet result)
            throws SQLException {
        throw new IllegalAccessError("Please override parseFromSQLResult(ResultSet) in your subclass!");
    }

    protected void appendQuoted(String value, StringBuilder sb) {
        if (value == null) {
            sb.append(value);
        }
        else {
            sb.append("'");
            sb.append(StringEscapeUtils.escapeSql(value));
            sb.append("'");
        }
    }

    /**
     * Useful for debugging
     */
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append(getClass().getName());
        sb.append("(");
        sb.append(this.toSQLValueListString());
        sb.append(")");
        return sb.toString();
    }

}
