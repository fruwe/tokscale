"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import {
  ProfileHeader,
  ProfileTabBar,
  TokenBreakdown,
  ProfileModels,
  ProfileActivity,
  ProfileEmptyActivity,
  ProfileStats,
  type ProfileUser,
  type ProfileStatsData,
  type ProfileTab,
  type ModelUsage,
} from "@/components/profile";
import type { TokenContributionData, DailyContribution, ClientType } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface ProfileData {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
    rank: number | null;
  };
  stats: {
    totalTokens: number;
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    submissionCount: number;
    activeDays: number;
  };
  dateRange: {
    start: string | null;
    end: string | null;
  };
  updatedAt: string | null;
  clients: string[];
  models: string[];
  modelUsage?: ModelUsage[];
  contributions: DailyContribution[];
}

interface ProfilePageClientProps {
  initialData: ProfileData;
  initialSources: SourceSummaryData[];
  initialSelectedSource: SourceDetailData | null;
  username: string;
}

interface SourceSummaryData {
  sourceId: string | null;
  sourceKey: string;
  sourceName: string;
  stats: {
    totalTokens: number;
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    reasoningTokens: number;
    submissionCount: number;
    activeDays: number;
  };
  dateRange: {
    start: string | null;
    end: string | null;
  };
  updatedAt: string | null;
  clients: string[];
  models: string[];
}

interface SourceDetailData extends SourceSummaryData {
  modelUsage?: ModelUsage[];
  contributions: DailyContribution[];
}

function buildGraphData(
  contributions: DailyContribution[],
  stats: {
    totalTokens: number;
    totalCost: number;
    activeDays: number;
  },
  dateRange: { start: string | null; end: string | null },
  clients: string[],
  models: string[]
): TokenContributionData | null {
  if (contributions.length === 0) return null;

  const maxCost = Math.max(...contributions.map((c) => c.totals.cost), 0);
  const yearMap = new Map<string, { totalTokens: number; totalCost: number; start: string; end: string }>();

  for (const day of contributions) {
    const year = day.date.split("-")[0];
    const existing = yearMap.get(year);
    if (existing) {
      existing.totalTokens += day.totals.tokens;
      existing.totalCost += day.totals.cost;
      if (day.date < existing.start) existing.start = day.date;
      if (day.date > existing.end) existing.end = day.date;
    } else {
      yearMap.set(year, {
        totalTokens: day.totals.tokens,
        totalCost: day.totals.cost,
        start: day.date,
        end: day.date,
      });
    }
  }

  const years = Array.from(yearMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, yearStats]) => ({
      year,
      totalTokens: yearStats.totalTokens,
      totalCost: yearStats.totalCost,
      range: { start: yearStats.start, end: yearStats.end },
    }));

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      version: "1.0.0",
      dateRange: {
        start: dateRange.start || contributions[0]?.date || "",
        end: dateRange.end || contributions[contributions.length - 1]?.date || "",
      },
    },
    summary: {
      totalTokens: stats.totalTokens,
      totalCost: stats.totalCost,
      totalDays: contributions.length,
      activeDays: stats.activeDays,
      averagePerDay: stats.activeDays > 0 ? stats.totalCost / stats.activeDays : 0,
      maxCostInSingleDay: maxCost,
      clients: clients as ClientType[],
      models,
    },
    years,
    contributions,
  };
}

export default function ProfilePageClient({
  initialData,
  initialSources,
  initialSelectedSource,
  username,
}: ProfilePageClientProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("activity");
  const [selectedSourceKey, setSelectedSourceKey] = useState<string | null>(
    initialSources[0]?.sourceKey ?? null
  );
  const [loadingSourceKey, setLoadingSourceKey] = useState<string | null>(
    initialSelectedSource ? null : (initialSources[0]?.sourceKey ?? null)
  );
  const [sourceDetailCache, setSourceDetailCache] = useState<Record<string, SourceDetailData>>(
    initialSelectedSource ? { [initialSelectedSource.sourceKey]: initialSelectedSource } : {}
  );
  const data = initialData;

  const graphData = useMemo(
    () =>
      buildGraphData(
        data.contributions,
        {
          totalTokens: data.stats.totalTokens,
          totalCost: data.stats.totalCost,
          activeDays: data.stats.activeDays,
        },
        data.dateRange,
        data.clients,
        data.models
      ),
    [data]
  );

  const user: ProfileUser = useMemo(() => ({
    username: data.user.username,
    displayName: data.user.displayName,
    avatarUrl: data.user.avatarUrl,
    rank: data.user.rank,
  }), [data]);

  const stats: ProfileStatsData = useMemo(() => ({
    totalTokens: data.stats.totalTokens,
    totalCost: data.stats.totalCost,
    inputTokens: data.stats.inputTokens,
    outputTokens: data.stats.outputTokens,
    cacheReadTokens: data.stats.cacheReadTokens,
    cacheWriteTokens: data.stats.cacheWriteTokens,
    activeDays: data.stats.activeDays,
    submissionCount: data.stats.submissionCount,
  }), [data]);

  const EARLY_ADOPTERS = ["code-yeongyu", "gtg7784", "qodot"];
  const showResubmitBanner = EARLY_ADOPTERS.includes(data.user.username) && data.stats.submissionCount === 1;

  const selectedSourceSummary = useMemo(() => {
    if (initialSources.length === 0) return null;
    return (
      initialSources.find((source) => source.sourceKey === selectedSourceKey)
      ?? initialSources[0]
    );
  }, [initialSources, selectedSourceKey]);

  const selectedSource = useMemo(
    () => (selectedSourceKey ? sourceDetailCache[selectedSourceKey] ?? null : null),
    [selectedSourceKey, sourceDetailCache]
  );

  useEffect(() => {
    if (!selectedSourceKey || sourceDetailCache[selectedSourceKey]) {
      return;
    }

    let cancelled = false;

    fetch(`/api/users/${username}/sources/${encodeURIComponent(selectedSourceKey)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch source detail: ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        if (cancelled || !payload?.source) return;
        setSourceDetailCache((current) => ({
          ...current,
          [selectedSourceKey]: payload.source as SourceDetailData,
        }));
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSourceKey((current) =>
            current === selectedSourceKey ? null : current
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSourceKey, sourceDetailCache, username]);

  const selectedSourceGraphData = useMemo(
    () =>
      selectedSource
        ? buildGraphData(
            selectedSource.contributions,
            {
              totalTokens: selectedSource.stats.totalTokens,
              totalCost: selectedSource.stats.totalCost,
              activeDays: selectedSource.stats.activeDays,
            },
            selectedSource.dateRange,
            selectedSource.clients,
            selectedSource.models
          )
        : null,
    [selectedSource]
  );

  return (
    <PageContainer style={{ backgroundColor: "#10121C" }}>
      <Navigation />

      {showResubmitBanner && (
        <BannerWrapper>
          <BannerContent>
            <BannerText>
              <BannerBold>Update available:</BannerBold>{" "}
              If you&apos;re <BannerBold>@{data.user.username}</BannerBold>, please re-submit your data with{" "}
              <BannerCode>bunx tokscale submit</BannerCode>{" "}
              to see detailed model breakdowns per day.
            </BannerText>
          </BannerContent>
        </BannerWrapper>
      )}

      <MainContent>
        <ContentWrapper>
          <ProfileHeader
            user={user}
            stats={stats}
            lastUpdated={data.updatedAt || undefined}
          />

          <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "activity" && (
            graphData ? (
              <ActivitySection>
                <ProfileActivity data={graphData} />
                <ProfileStats
                  stats={stats}
                  favoriteModel={
                    data.modelUsage?.reduce((max, current) => current.cost > max.cost ? current : max, data.modelUsage[0])?.model
                  }
                />
              </ActivitySection>
            ) : <ProfileEmptyActivity />
          )}
          {activeTab === "breakdown" && <TokenBreakdown stats={stats} />}
          {activeTab === "models" && <ProfileModels models={data.models} modelUsage={data.modelUsage} />}
          {activeTab === "sources" && (
            initialSources.length > 0 ? (
              <SourcesSection>
                <SourcesGrid>
                  {initialSources.map((source) => {
                    const isSelected = source.sourceKey === selectedSourceKey;

                    return (
                      <SourceCard
                        key={source.sourceKey}
                        $selected={isSelected}
                        onClick={() => {
                          setSelectedSourceKey(source.sourceKey);
                          setLoadingSourceKey(
                            sourceDetailCache[source.sourceKey] ? null : source.sourceKey
                          );
                        }}
                        type="button"
                      >
                        <SourceCardHeader>
                          <SourceCardTitle>{source.sourceName}</SourceCardTitle>
                          <SourceCardUpdated>
                            {source.updatedAt
                              ? new Date(source.updatedAt).toLocaleDateString()
                              : "No updates"}
                          </SourceCardUpdated>
                        </SourceCardHeader>
                        <SourceCardValue>{formatNumber(source.stats.totalTokens)}</SourceCardValue>
                        <SourceCardSubValue>{formatCurrency(source.stats.totalCost)}</SourceCardSubValue>
                        <SourceCardMeta>
                          <span>{source.stats.submissionCount} submits</span>
                          <span>{source.stats.activeDays} active days</span>
                        </SourceCardMeta>
                      </SourceCard>
                    );
                  })}
                </SourcesGrid>

                {selectedSourceSummary && (
                  <SelectedSourceSection>
                    <SelectedSourceHeader>
                      <SelectedSourceTitle>{selectedSourceSummary.sourceName}</SelectedSourceTitle>
                      <SelectedSourceSubtitle>
                        {selectedSourceSummary.sourceId ?? "legacy"} ·{" "}
                        {selectedSourceSummary.updatedAt
                          ? `Updated ${new Date(selectedSourceSummary.updatedAt).toLocaleString()}`
                          : "No updates yet"}
                      </SelectedSourceSubtitle>
                    </SelectedSourceHeader>

                    <SourceTagRow>
                      {selectedSourceSummary.clients.map((client) => (
                        <SourceTag key={`client-${client}`}>{client}</SourceTag>
                      ))}
                      {selectedSourceSummary.models.slice(0, 8).map((model) => (
                        <SourceTag key={`model-${model}`}>{model}</SourceTag>
                      ))}
                    </SourceTagRow>

                    {loadingSourceKey === selectedSourceKey && !selectedSource ? (
                      <SourceLoadingCard>
                        Loading source details…
                      </SourceLoadingCard>
                    ) : selectedSourceGraphData && selectedSource ? (
                      <ActivitySection>
                        <ProfileActivity data={selectedSourceGraphData} />
                        <ProfileStats
                          stats={selectedSource.stats}
                          favoriteModel={
                            selectedSource.modelUsage?.reduce((max, current) =>
                              current.cost > max.cost ? current : max,
                            selectedSource.modelUsage[0])?.model
                          }
                        />
                        <TokenBreakdown stats={selectedSource.stats} />
                        <ProfileModels
                          models={selectedSource.models}
                          modelUsage={selectedSource.modelUsage}
                        />
                      </ActivitySection>
                    ) : (
                      <ProfileEmptyActivity />
                    )}
                  </SelectedSourceSection>
                )}
              </SourcesSection>
            ) : <ProfileEmptyActivity />
          )}
        </ContentWrapper>
      </MainContent>

      <Footer />
    </PageContainer>
  );
}

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  padding-top: 64px;
`;

const BannerWrapper = styled.div`
  background-color: rgba(245, 158, 11, 0.1);
  border-bottom: 1px solid rgba(245, 158, 11, 0.2);
`;

const BannerContent = styled.div`
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 16px;
  padding-right: 16px;
  padding-top: 12px;
  padding-bottom: 12px;

  @media (min-width: 640px) {
    padding-left: 24px;
    padding-right: 24px;
  }
`;

const BannerText = styled.p`
  font-size: 14px;
  color: #fde68a;
`;

const BannerBold = styled.span`
  font-weight: 600;
`;

const BannerCode = styled.code`
  padding-left: 6px;
  padding-right: 6px;
  padding-top: 2px;
  padding-bottom: 2px;
  border-radius: 4px;
  background-color: rgba(245, 158, 11, 0.2);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
`;

const MainContent = styled.main`
  flex: 1;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 16px;
  padding-right: 16px;
  padding-top: 24px;
  padding-bottom: 24px;
  width: 100%;

  @media (min-width: 640px) {
    padding-left: 24px;
    padding-right: 24px;
    padding-top: 40px;
    padding-bottom: 40px;
  }
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const ActivitySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SourcesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SourcesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

const SourceCard = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 16px;
  border: 1px solid;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  background-color: ${({ $selected }) =>
    $selected ? "var(--color-bg-active)" : "var(--color-bg-elevated)"};
  border-color: ${({ $selected }) =>
    $selected ? "var(--color-fg-default)" : "var(--color-border-default)"};
  transition: transform 120ms ease, border-color 120ms ease;

  &:hover {
    transform: translateY(-1px);
  }
`;

const SourceCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
`;

const SourceCardTitle = styled.span`
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-fg-default);
`;

const SourceCardUpdated = styled.span`
  font-size: 0.75rem;
  color: var(--color-fg-muted);
`;

const SourceCardValue = styled.span`
  font-size: 1.375rem;
  font-weight: 800;
  color: var(--color-fg-default);
`;

const SourceCardSubValue = styled.span`
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-fg-muted);
`;

const SourceCardMeta = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: var(--color-fg-muted);
`;

const SelectedSourceSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SelectedSourceHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SelectedSourceTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-fg-default);
`;

const SelectedSourceSubtitle = styled.p`
  font-size: 0.875rem;
  color: var(--color-fg-muted);
  word-break: break-word;
`;

const SourceTagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const SourceTag = styled.span`
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-elevated);
  color: var(--color-fg-muted);
  font-size: 0.8rem;
  font-weight: 600;
`;

const SourceLoadingCard = styled.div`
  border-radius: 16px;
  border: 1px solid var(--color-border-default);
  background-color: var(--color-bg-elevated);
  color: var(--color-fg-muted);
  padding: 20px;
  font-size: 0.95rem;
  font-weight: 600;
`;
