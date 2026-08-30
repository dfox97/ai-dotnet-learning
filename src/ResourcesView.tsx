import { useState } from 'react';
import { ArrowUpRight, BookMarked, Filter, Search, Sparkles } from 'lucide-react';
import { resourceCategories, resources, type LearningResource } from './resources';

const levelOrder: Record<LearningResource['level'], number> = {
  Foundation: 0,
  Core: 1,
  Production: 2,
};

export default function ResourcesView() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof resourceCategories)[number]>('All');
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = resources
    .filter((resource) => category === 'All' || resource.category === category)
    .filter((resource) => `${resource.title} ${resource.description} ${resource.reviewUse}`.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => levelOrder[left.level] - levelOrder[right.level]);

  return (
    <div className="page resources-page">
      <header className="page-header resource-header">
        <div>
          <p className="eyebrow">CURATED READING</p>
          <h1>Read with a question.</h1>
          <p>Official guides and production samples selected for code reviewers—not an endless bookmark list.</p>
        </div>
        <div className="header-chip"><span className="status-dot" /> {resources.length} resources</div>
      </header>

      <section className="resource-principle">
        <div><Sparkles size={22} /></div>
        <p><strong>AI-era learning rule:</strong> ask an agent to explain or trace code, then verify its answer against compiler diagnostics, runtime behavior and primary documentation. Fluency is knowing what evidence would disprove a plausible answer.</p>
      </section>

      <div className="resource-tools">
        <label className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lifetimes, EF queries, agents…" />
        </label>
        <div className="category-filters" aria-label="Resource categories">
          <Filter size={15} />
          {resourceCategories.map((item) => (
            <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
      </div>

      <div className="resource-count"><span>{filtered.length} results</span><i /></div>
      <div className="resource-grid">
        {filtered.map((resource) => (
          <a href={resource.url} target="_blank" rel="noreferrer" className="resource-card" key={resource.url}>
            <div className="resource-card-top">
              <div className="resource-mark"><BookMarked size={18} /></div>
              <span className={`resource-level ${resource.level.toLowerCase()}`}>{resource.level}</span>
            </div>
            <p className="resource-category">{resource.category} · {resource.format}</p>
            <h2>{resource.title}</h2>
            <p>{resource.description}</p>
            <div className="review-use"><strong>Use in a review</strong><span>{resource.reviewUse}</span></div>
            <div className="resource-link">Open primary source <ArrowUpRight size={15} /></div>
          </a>
        ))}
      </div>

      {filtered.length === 0 && <div className="empty-state"><Search size={26} /><h3>No matching resource</h3><p>Try a broader term or select all categories.</p></div>}
    </div>
  );
}
