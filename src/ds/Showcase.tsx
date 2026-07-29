/** Zevra Design Language — foundation showcase / verification harness.
 *  Not a product screen — a living gallery of the Phase 1 foundation in both themes.
 *  To view: temporarily render <Showcase /> from App, or route to it in dev. */
import {
  AppShell, TopBar, Brand, Nav, NavItem, Avatar, Stage, Grid, SectionLabel,
  ThemeProvider, ThemeToggle, CommandBar,
  Display, Heading, Text, Label, Kpi,
  Button, IconButton,
  Badge, StatusDot,
  Card, CardLabel, CardTitle, CardBody, MetricCard, ConfidenceBar,
  Field, Input, Select, Search, Chip, FilterChip,
  TableWrap, Table, THead, TBody, Th, Tr, Td, RowActions, TableEmpty,
} from './index';
import type { StatusKind } from './types';
import { MoreHorizontal } from 'lucide-react';

const statuses: StatusKind[] = ['healthy', 'investigating', 'warning', 'critical', 'resolved', 'running', 'waiting', 'info', 'neutral'];

export function Showcase() {
  return (
    <ThemeProvider>
      <AppShell>
        <TopBar>
          <Brand />
          <div className="mx-auto w-full max-w-[520px]"><CommandBar items={[
            { id: '1', label: <><b className="text-z-primary">Investigate</b> the Southwest inventory drop</> },
            { id: '2', label: <><b className="text-z-primary">Summarize</b> this week for the board</> },
          ]} footer="Reasoned over governed data · every answer traceable" /></div>
          <Nav>
            <NavItem active>Command</NavItem>
            <NavItem>Investigations</NavItem>
            <NavItem>Executive Brief</NavItem>
            <NavItem>AI Workforce</NavItem>
          </Nav>
          <ThemeToggle />
          <Avatar initials="DR" />
        </TopBar>

        <Stage>
          <Display>Zevra Design Language v1.0</Display>
          <Text size="lg" tone="secondary" className="mt-3 max-w-z-read">The Phase 1 foundation — every component consumes approved tokens and works in light and dark.</Text>

          <SectionLabel>Typography</SectionLabel>
          <div className="space-y-2">
            <Heading level={1}>Heading 1 — screen titles</Heading>
            <Heading level={2}>Heading 2 — sections</Heading>
            <Heading level={3}>Heading 3 — card titles</Heading>
            <Text>Body — the default reading text, calm and legible.</Text>
            <Text size="sm" tone="tertiary">Caption — secondary detail and timestamps.</Text>
            <div className="flex items-end gap-6 pt-2">
              <Kpi className="text-z-up">+3.1%</Kpi><Kpi className="text-z-down">−8.2%</Kpi><Kpi>$2.4M</Kpi>
            </div>
          </div>

          <SectionLabel>Buttons</SectionLabel>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <IconButton label="More"><MoreHorizontal size={20} /></IconButton>
          </div>

          <SectionLabel>Status language</SectionLabel>
          <div className="flex flex-wrap gap-3">
            {statuses.map((s) => (
              <Badge key={s} status={s} dot live={s === 'running'}>{s}</Badge>
            ))}
          </div>

          <SectionLabel>Cards</SectionLabel>
          <Grid cols={3}>
            <MetricCard value="+3.1%" label="Revenue to plan" trend="up" />
            <Card interactive accent="critical">
              <div className="flex items-center justify-between"><Badge status="critical">Forming</Badge><span className="text-z-caption text-z-text-3">02:10</span></div>
              <CardTitle>Inventory drop · Southwest</CardTitle>
              <CardBody>8.2% decline across 12 stores, isolated to supplier Northgate Foods.</CardBody>
            </Card>
            <Card interactive>
              <Badge status="investigating" dot live>Investigating</Badge>
              <CardTitle>Why did on-hand fall 8.2%?</CardTitle>
              <ConfidenceBar value={91} className="mt-4" />
            </Card>
          </Grid>

          <SectionLabel>Forms</SectionLabel>
          <div className="grid max-w-xl gap-5">
            <Field label="Agent name"><Input placeholder="e.g. Inventory Investigator" /></Field>
            <Field label="Data scope"><Select><option>retail_core · inventory_balances</option></Select></Field>
            <Search kbd="⌘K" placeholder="Search or ask…" />
            <div className="flex flex-wrap gap-2">
              <FilterChip active>Critical</FilterChip><FilterChip>Investigating</FilterChip><FilterChip>Southwest</FilterChip>
              <Chip>inventory_balances</Chip><Chip>goods_receipts</Chip>
            </div>
          </div>

          <SectionLabel>Table</SectionLabel>
          <TableWrap>
            <Table>
              <THead>
                <Tr>
                  <Th sortable sort="asc">Store</Th>
                  <Th>Region</Th>
                  <Th>Status</Th>
                  <Th numeric sortable>On-hand</Th>
                  <Th numeric sortable>Δ 24h</Th>
                  <Th><span className="sr-only">Actions</span></Th>
                </Tr>
              </THead>
              <TBody>
                <Tr selected interactive><Td><b className="text-z-text">Store 1042</b></Td><Td>Southwest</Td><Td><Badge status="critical">Critical</Badge></Td><Td numeric>18,204</Td><Td numeric className="text-z-down">−11.4%</Td><Td><RowActions><IconButton label="More"><MoreHorizontal size={18} /></IconButton></RowActions></Td></Tr>
                <Tr interactive><Td><b className="text-z-text">Store 0917</b></Td><Td>West</Td><Td><Badge status="healthy">Healthy</Badge></Td><Td numeric>31,540</Td><Td numeric className="text-z-up">+2.1%</Td><Td><RowActions><IconButton label="More"><MoreHorizontal size={18} /></IconButton></RowActions></Td></Tr>
              </TBody>
            </Table>
          </TableWrap>

          <SectionLabel>Empty state</SectionLabel>
          <TableWrap>
            <TableEmpty title="No stores match these filters" description="Try widening the region or clearing the “at risk” filter." action={<Button variant="secondary" size="sm">Clear filters</Button>} />
          </TableWrap>
        </Stage>
      </AppShell>
    </ThemeProvider>
  );
}
