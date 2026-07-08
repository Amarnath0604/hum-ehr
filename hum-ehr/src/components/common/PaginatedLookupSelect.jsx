import { useCallback, useEffect, useRef, useState } from 'react';
import Select, { components } from 'react-select';
import { DEBOUNCE_LOOKUP_MS } from '../../constants/timing';

const BaseMenuList = components.MenuList;

// react-select's onMenuScrollToBottom only fires for wheel/touch gestures;
// this MenuList also fires it when the scrollbar itself reaches the bottom.
const PaginatedMenuList = (props) => (
    <BaseMenuList
      {...props}
      innerProps={{
          ...props.innerProps,
          onScroll: (event) => {
              const target = event.target;
              if (target.scrollHeight - target.scrollTop - target.clientHeight < 8) {
                  props.selectProps.onMenuScrollToBottom?.(event);
              }
          },
      }}
    />
);

/**
 * Server-paginated lookup select (legacy fetchPaginationLookUpDataAvailableInApp):
 * the menu loads the first page ({start:0, length:50}) for the current search
 * term, and scrolling the suggestion list to the bottom appends the next page
 * while more records remain (totalRecords > loaded count). Typing re-queries
 * from page 0 (debounced).
 *
 * `fetchPage(search, start)` must resolve to `{ options: [{value,label,...}], totalRecords }`.
 */
const PaginatedLookupSelect = ({ fetchPage, value = null, onChange, placeholder = 'Type/Search Here', isDisabled = false, isClearable = true, inputId }) => {
    const [options, setOptions] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const loadedForRef = useRef(null); // search term the current options belong to
    const debounceRef = useRef(null);
    const loadingMoreRef = useRef(false);
    const lastRequestedStartRef = useRef(-1); // dedup: one request per page offset

    const loadFirstPage = useCallback(async (term) => {
        setLoading(true);
        lastRequestedStartRef.current = 0;
        try {
            const page = await fetchPage(term, 0);
            setOptions(page.options);
            setTotalRecords(page.totalRecords);
            loadedForRef.current = term;
        }
        catch (error) { console.error('Failed to fetch the details for the lookup.', error); }
        finally { setLoading(false); }
    }, [fetchPage]);

    useEffect(() => () => clearTimeout(debounceRef.current), []);

    const handleInputChange = (input, { action }) => {
        if (action !== 'input-change') return;
        setSearch(input);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => loadFirstPage(input), DEBOUNCE_LOOKUP_MS);
    };

    const handleMenuOpen = () => {
        if (loadedForRef.current === null) loadFirstPage(search);
    };

    // Legacy scroll handler: fetch the next 50 when the list bottoms out and
    // more records remain; append to the existing source.
    const handleMenuScrollToBottom = async () => {
        const nextStart = options.length;
        if (loadingMoreRef.current || loading || nextStart >= totalRecords) return;
        if (nextStart === lastRequestedStartRef.current) return; // page already requested
        loadingMoreRef.current = true;
        lastRequestedStartRef.current = nextStart;
        setLoading(true);
        try {
            const page = await fetchPage(loadedForRef.current ?? '', nextStart);
            setOptions((prev) => [...prev, ...page.options]);
            setTotalRecords(page.totalRecords);
        }
        catch (error) { console.error('Failed to fetch the details for the lookup.', error); }
        finally {
            loadingMoreRef.current = false;
            setLoading(false);
        }
    };

    return (
      <Select
        classNamePrefix="react-select"
        inputId={inputId}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isClearable={isClearable}
        isLoading={loading}
        options={options}
        value={value}
        onChange={onChange}
        onInputChange={handleInputChange}
        onMenuOpen={handleMenuOpen}
        onMenuScrollToBottom={handleMenuScrollToBottom}
        components={{ MenuList: PaginatedMenuList }}
        filterOption={() => true}
        noOptionsMessage={() => (loading ? 'Loading...' : 'No results found')}
      />
    );
};
export default PaginatedLookupSelect;
