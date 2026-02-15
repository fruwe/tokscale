"use client";

import styled from "styled-components";
import { Skeleton } from "@/components/Skeleton";

const ModelsContainer = styled.div`
  & > * + * {
    margin-top: 1rem;
  }
`;

const SearchBarContainer = styled.div`
  margin-bottom: 1.5rem;
`;

const TabBarContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border-default);
`;

const TableContainer = styled.div`
  border-radius: 1rem;
  border: 1px solid;
  overflow: hidden;
`;

const TableHeader = styled.div`
  border-bottom: 1px solid;
  padding: 0.75rem 1.5rem;
`;

const HeaderContent = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr;
  gap: 1.5rem;
`;

const TableRow = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid;

  &:last-child {
    border-bottom: 0;
  }
`;

const RowContent = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr;
  gap: 1.5rem;
  align-items: center;
`;

export function ModelsSkeleton() {
  return (
    <ModelsContainer>
      <SearchBarContainer>
        <Skeleton $h="2.5rem" $w="100%" $rounded="0.5rem" />
      </SearchBarContainer>

      <TabBarContainer>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={`tab-${i}`} $h="1.5rem" $w="6rem" $rounded="0.5rem" />
        ))}
      </TabBarContainer>

      <TableContainer
        style={{ backgroundColor: "#10121C", borderColor: "#1E2733" }}
      >
        <TableHeader
          style={{ backgroundColor: "var(--color-bg-elevated)", borderColor: "var(--color-border-default)" }}
        >
          <HeaderContent>
            <Skeleton $h="1rem" $w="5rem" />
            <Skeleton $h="1rem" $w="4rem" />
            <Skeleton $h="1rem" $w="4rem" />
            <Skeleton $h="1rem" $w="4rem" />
            <Skeleton $h="1rem" $w="5rem" />
          </HeaderContent>
        </TableHeader>
        {[...Array(10)].map((_, i) => (
          <TableRow
            key={`row-${i}`}
            style={{ borderColor: "var(--color-border-default)" }}
          >
            <RowContent>
              <Skeleton $h="1rem" $w="8rem" />
              <Skeleton $h="1rem" $w="5rem" />
              <Skeleton $h="1rem" $w="4rem" />
              <Skeleton $h="1rem" $w="4rem" />
              <Skeleton $h="1rem" $w="5rem" />
            </RowContent>
          </TableRow>
        ))}
      </TableContainer>
    </ModelsContainer>
  );
}
