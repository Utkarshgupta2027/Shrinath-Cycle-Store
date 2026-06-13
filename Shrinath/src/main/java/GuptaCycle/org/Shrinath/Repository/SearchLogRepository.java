package GuptaCycle.org.Shrinath.Repository;

import GuptaCycle.org.Shrinath.Model.SearchLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchLogRepository extends JpaRepository<SearchLog, Long> {

    /** Searches where user found NOTHING — ranked by frequency */
    @Query("SELECT s.query, COUNT(s) as cnt FROM SearchLog s " +
           "WHERE s.resultCount = 0 " +
           "GROUP BY s.query " +
           "ORDER BY cnt DESC")
    List<Object[]> topFailedSearches();

    /** All searches ranked by frequency */
    @Query("SELECT s.query, COUNT(s) as cnt, AVG(s.resultCount) as avgResults " +
           "FROM SearchLog s " +
           "GROUP BY s.query " +
           "ORDER BY cnt DESC")
    List<Object[]> topSearchTerms();

    /** Total failed search count */
    long countByResultCount(int resultCount);
}
