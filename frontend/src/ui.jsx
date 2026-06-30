import { useState, useEffect } from 'react';
import { selectRows } from './tableView.js';

export function useTableView(rows, searchFields) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState({ key: null, dir: 1 });

    const view = selectRows(rows, searchFields, query, sort);

    function toggleSort(key) {
        setSort((prev) => (prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }));
    }

    return { query, setQuery, view, sort, toggleSort };
}

export function SortHeader({ label, sortKey, sort, toggleSort, className }) {
    const active = sort.key === sortKey;
    const arrow = active ? (sort.dir === 1 ? ' +' : ' -') : '';

    return (
        <th
            className={`sortable${className ? ' ' + className : ''}`}
            onClick={() => toggleSort(sortKey)}
            aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
        >
            {label}{arrow}
        </th>
    );
}

export function SearchBox({ query, setQuery, placeholder }) {
    return (
        <input
            className="search"
            type="search"
            placeholder={placeholder || 'Search…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
        />
    );
}

export function onEnter(fn) {
    return (e) => {
        if (e.key === 'Enter') fn();
    };
}

export function useFlash(ms = 3000) {
    const [msg, setMsg] = useState('');
    
    useEffect(() => {
        if (!msg) return;

        const timer = setTimeout(() => setMsg(''), ms);

        return () => clearTimeout(timer);
    }, [msg, ms]);

    return [msg, setMsg];
}
