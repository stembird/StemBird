"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CanonicalTag from "@/components/CanonicalTag";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  User,
  Building2,
  Rocket,
  Briefcase,
  Search as SearchIcon,
  Zap,
  Settings,
  BookOpen,
  FilePlus,
  Users,
  BarChart3,
  ClipboardList,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { faqData, type FAQCategory } from "@/data/faqData";

/** Parse [text](url) markdown links into Next.js Link components */
function renderAnswer(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return (
        <Link key={i} href={match[2]} className="text-primary underline underline-offset-2 hover:no-underline">
          {match[1]}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const iconMap: Record<string, React.ReactNode> = {
  User: <User className="h-4 w-4" />,
  Building2: <Building2 className="h-4 w-4" />,
  Rocket: <Rocket className="h-4 w-4" />,
  Briefcase: <Briefcase className="h-4 w-4" />,
  Search: <SearchIcon className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  Settings: <Settings className="h-4 w-4" />,
  BookOpen: <BookOpen className="h-4 w-4" />,
  FilePlus: <FilePlus className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
  BarChart3: <BarChart3 className="h-4 w-4" />,
  ClipboardList: <ClipboardList className="h-4 w-4" />,
};

function FAQCategorySection({
  category,
  searchQuery,
}: {
  category: FAQCategory;
  searchQuery: string;
}) {
  const filtered = searchQuery
    ? category.questions.filter(
        (q) =>
          q.q.toLowerCase().includes(searchQuery) ||
          q.a.toLowerCase().includes(searchQuery)
      )
    : category.questions;

  if (filtered.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {iconMap[category.icon] || <HelpCircle className="h-4 w-4" />}
          {category.title}
          <Badge variant="secondary" className="ml-auto text-xs">
            {filtered.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible className="w-full">
          {filtered.map((faq, idx) => (
            <AccordionItem key={idx} value={`${category.title}-${idx}`}>
              <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {renderAnswer(faq.a)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState("candidates");
  const [searchQuery, setSearchQuery] = useState("");

  const currentSection = faqData.find((s) => s.id === activeTab);

  // Count total questions for search results
  const searchResults = useMemo(() => {
    if (!searchQuery) return null;
    const q = searchQuery.toLowerCase();
    return faqData.flatMap((section) =>
      section.categories.flatMap((cat) =>
        cat.questions
          .filter(
            (faq) =>
              faq.q.toLowerCase().includes(q) ||
              faq.a.toLowerCase().includes(q)
          )
          .map((faq) => ({ ...faq, section: section.label, category: cat.title }))
      )
    );
  }, [searchQuery]);

  return (
    <>
      <CanonicalTag url="/faq" />
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Hero */}
        <div className="bg-primary/5 border-b">
          <div className="container mx-auto px-4 py-12 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Frequently Asked Questions
            </h1>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Everything you need to know about CareerSasa. Find answers for candidates and employers.
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchQuery("")}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Search results mode */}
          {searchQuery ? (
            <div className="max-w-3xl mx-auto">
              <p className="text-sm text-muted-foreground mb-4">
                {searchResults?.length ?? 0} result{searchResults?.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
              </p>
              {searchResults?.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium">No questions match your search</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try different keywords or browse the categories below.
                    </p>
                  </CardContent>
                </Card>
              )}
              {searchResults?.map((result, idx) => (
                <Card key={idx} className="mb-3">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {result.section}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {result.category}
                      </span>
                    </div>
                    <p className="font-medium text-sm mb-1">{result.q}</p>
                    <p className="text-sm text-muted-foreground">{renderAnswer(result.a)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Tabbed browse mode */
            <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-3xl mx-auto">
              <div className="flex justify-center mb-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  {faqData.map((section) => (
                    <TabsTrigger
                      key={section.id}
                      value={section.id}
                      className="flex items-center gap-2"
                    >
                      {iconMap[section.icon]}
                      <span>{section.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {faqData.map((section) => (
                <TabsContent key={section.id} value={section.id} className="space-y-2">
                  {section.categories.map((category, idx) => (
                    <FAQCategorySection
                      key={idx}
                      category={category}
                      searchQuery=""
                    />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Still need help */}
          <Card className="max-w-3xl mx-auto mt-10 bg-primary/5 border-primary/20">
            <CardContent className="py-8 text-center">
              <HelpCircle className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">Still need help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Can't find what you're looking for? Reach out to our team directly.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link href="/contact">
                  <Button variant="default" size="sm">
                    Contact Us
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/blog">
                  <Button variant="outline" size="sm">
                    Read Our Blog
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
