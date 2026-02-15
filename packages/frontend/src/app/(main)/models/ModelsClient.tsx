"use client";

import { Fragment, useMemo, useState } from "react";
import styled from "styled-components";
import { Pagination } from "@primer/react";
import { TabBar } from "@/components/TabBar";

interface ModelVariant {
  fullKey: string;
  provider: string;
  inputCostPer1M: number | null;
  outputCostPer1M: number | null;
  cacheReadPer1M: number | null;
  cacheWritePer1M: number | null;
  contextWindow: number | null;
  maxOutput: number | null;
  capabilities: string[];
}

interface DeduplicatedModel {
  name: string;
  cheapestVariant: ModelVariant;
  variantCount: number;
  variants: ModelVariant[];
}

interface ModelsData {
  models: DeduplicatedModel[];
  providers: string[];
  totalCount: number;
}

interface ModelsClientProps {
  initialData: ModelsData;
}

const Section = styled.div`
  margin-bottom: 40px;
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 8px;
  color: var(--color-fg-default);
`;

const Description = styled.p`
  margin-bottom: 24px;
  color: var(--color-fg-muted);
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 200px;
  max-width: 360px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-elevated);
  color: var(--color-fg-default);
  font-size: 14px;

  &::placeholder {
    color: var(--color-fg-muted);
  }

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`;

const SortControl = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-fg-muted);
  font-size: 13px;
`;

const SortSelect = styled.select`
  padding: 8px 28px 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-elevated);
  color: var(--color-fg-default);
  font-size: 14px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%239CA3AF' stroke-width='1.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
`;

const TabSection = styled.div`
  margin-bottom: 16px;
`;

const TabScroller = styled.div`
  overflow-x: auto;
  padding-bottom: 2px;
`;

const CardList = styled.div`
  border-radius: 16px;
  border: 1px solid var(--color-border-default);
  overflow: hidden;
  background-color: var(--color-bg-default);
`;

const ModelCard = styled.div<{ $expanded?: boolean }>`
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-default);
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background-color: rgba(20, 26, 33, 0.4);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
`;

const ModelName = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: var(--color-fg-default);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const VariantCount = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-fg-muted);
  flex-shrink: 0;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
`;

const CapBadge = styled.span`
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid var(--color-border-default);
  color: var(--color-fg-muted);
  background: var(--color-bg-subtle);
`;

const MetaLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 13px;
  color: var(--color-fg-muted);
`;

const MetaDot = styled.span`
  color: var(--color-fg-muted);

  &::before {
    content: "·";
  }
`;

const VariantPanel = styled.div`
  background-color: var(--color-bg-subtle);
  border-bottom: 1px solid var(--color-border-default);
`;

const VariantItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 20px 8px 32px;
  border-top: 1px solid var(--color-border-default);
  font-size: 13px;
  color: var(--color-fg-muted);

  &:first-child {
    border-top: none;
  }

  @media (max-width: 900px) {
    flex-wrap: wrap;
    gap: 8px 12px;
  }
`;

const VariantKey = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
  font-size: 12px;
`;

const VariantMeta = styled.span`
  white-space: nowrap;
`;

const EmptyState = styled.div`
  padding: 24px;
  text-align: center;
  color: var(--color-fg-muted);
`;

const PaginationContainer = styled.div`
  margin-top: 12px;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  @media (min-width: 640px) {
    padding: 16px 0;
    flex-direction: row;
  }
`;

const PaginationText = styled.p`
  font-size: 12px;
  color: var(--color-fg-muted);
`;

function formatPrice(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "$0";
  const formatted = value.toFixed(2);
  return `$${formatted.replace(/\.?0+$/, "")}`;
}

function formatContext(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString("en-US");
}

type SortOption =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "context-desc"
  | "context-asc";

function getComparablePrice(variant: ModelVariant): number | null {
  const input = variant.inputCostPer1M;
  const output = variant.outputCostPer1M;
  if (input === null && output === null) return null;
  if (input !== null && output !== null) return input + output;
  return input ?? output;
}

function compareNullableNumbers(a: number | null, b: number | null, order: "asc" | "desc") {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return order === "asc" ? a - b : b - a;
}

export default function ModelsClient({ initialData }: ModelsClientProps) {
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const filteredAndSortedModels = useMemo(() => {
    const bySearch = initialData.models.filter((model) =>
      model.name.toLowerCase().includes(search.toLowerCase())
    );

    const byProvider =
      selectedProvider === "all"
        ? bySearch
        : bySearch.filter((model) =>
            model.variants.some((variant) => variant.provider === selectedProvider)
          );

    const sorted = [...byProvider];
    switch (sortBy) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        sorted.sort((a, b) =>
          compareNullableNumbers(
            getComparablePrice(a.cheapestVariant),
            getComparablePrice(b.cheapestVariant),
            "asc"
          )
        );
        break;
      case "price-desc":
        sorted.sort((a, b) =>
          compareNullableNumbers(
            getComparablePrice(a.cheapestVariant),
            getComparablePrice(b.cheapestVariant),
            "desc"
          )
        );
        break;
      case "context-desc":
        sorted.sort((a, b) =>
          compareNullableNumbers(
            a.cheapestVariant.contextWindow,
            b.cheapestVariant.contextWindow,
            "desc"
          )
        );
        break;
      case "context-asc":
        sorted.sort((a, b) =>
          compareNullableNumbers(
            a.cheapestVariant.contextWindow,
            b.cheapestVariant.contextWindow,
            "asc"
          )
        );
        break;
      default:
        break;
    }

    return sorted;
  }, [initialData.models, search, selectedProvider, sortBy]);

  const total = filteredAndSortedModels.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paginatedModels = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAndSortedModels.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedModels, safePage]);

  const start = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, total);

  const toggleExpanded = (modelName: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(modelName)) {
        next.delete(modelName);
      } else {
        next.add(modelName);
      }
      return next;
    });
  };

  return (
    <>
      <Section>
        <Title>Models</Title>
        <Description>
          {initialData.totalCount} models tracked with real-time pricing
        </Description>

        <HeaderRow>
          <SearchInput
            placeholder="Search models..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <SortControl>
            Sort by:
            <SortSelect
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                setPage(1);
              }}
            >
              <option value="name-asc">Name A→Z</option>
              <option value="name-desc">Name Z→A</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="context-desc">Context: High to Low</option>
              <option value="context-asc">Context: Low to High</option>
            </SortSelect>
          </SortControl>
        </HeaderRow>

        <TabSection>
          <TabScroller>
            <TabBar
              tabs={[
                { id: "all", label: "All" },
                ...initialData.providers.map((provider) => ({
                  id: provider,
                  label: provider,
                })),
              ]}
              activeTab={selectedProvider}
              onTabChange={(tab) => {
                setSelectedProvider(tab);
                setPage(1);
              }}
            />
          </TabScroller>
        </TabSection>

        <CardList>
          {paginatedModels.length === 0 ? (
            <EmptyState>No models found.</EmptyState>
          ) : (
            paginatedModels.map((model) => {
              const expanded = expandedRows.has(model.name);
              const extraProviders = model.variantCount - 1;

              return (
                <Fragment key={model.name}>
                  <ModelCard
                    $expanded={expanded}
                    onClick={() => toggleExpanded(model.name)}
                  >
                    <CardHeader>
                      <ModelName>{model.name}</ModelName>
                      <VariantCount>
                        {extraProviders > 0 ? `+${extraProviders} providers` : "1 provider"}
                        <span>{expanded ? "▼" : "▶"}</span>
                      </VariantCount>
                    </CardHeader>

                    {model.cheapestVariant.capabilities.length > 0 && (
                      <BadgeRow>
                        {model.cheapestVariant.capabilities.map((capability) => (
                          <CapBadge key={`${model.name}-${capability}`}>{capability}</CapBadge>
                        ))}
                      </BadgeRow>
                    )}

                    <MetaLine>
                      <span>{model.cheapestVariant.provider}</span>
                      <MetaDot />
                      <span>{formatContext(model.cheapestVariant.contextWindow)} context</span>
                      <MetaDot />
                      <span>{formatPrice(model.cheapestVariant.inputCostPer1M)}/M input</span>
                      <MetaDot />
                      <span>{formatPrice(model.cheapestVariant.outputCostPer1M)}/M output</span>
                    </MetaLine>
                  </ModelCard>

                  {expanded && (
                    <VariantPanel>
                      {model.variants.map((variant) => (
                        <VariantItem key={variant.fullKey}>
                          <VariantKey>{variant.fullKey}</VariantKey>
                          <VariantMeta>{variant.provider}</VariantMeta>
                          <VariantMeta>{formatPrice(variant.inputCostPer1M)} in</VariantMeta>
                          <VariantMeta>{formatPrice(variant.outputCostPer1M)} out</VariantMeta>
                          <VariantMeta>{formatContext(variant.contextWindow)}</VariantMeta>
                        </VariantItem>
                      ))}
                    </VariantPanel>
                  )}
                </Fragment>
              );
            })
          )}
        </CardList>

        {totalPages > 1 && (
          <PaginationContainer>
            <PaginationText>
              Showing {start}-{end} of {total}
            </PaginationText>
            <Pagination
              pageCount={totalPages}
              currentPage={safePage}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              showPages={{ narrow: false, regular: true, wide: true }}
            />
          </PaginationContainer>
        )}
      </Section>
    </>
  );
}
