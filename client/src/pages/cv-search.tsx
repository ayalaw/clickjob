import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Plus, Eye, Mail, Calendar, Loader2, Clock, Users } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface SearchResult {
  candidateId: string;
  firstName: string;
  lastName: string;
  city: string;
  phone: string;
  email: string;
  matchedKeywords: string[];
  cvPreview: string;
  extractedAt: string;
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  query: {
    positiveKeywords: string[];
    negativeKeywords: string[];
  };
}

export default function CVSearchPage() {
  const [positiveKeywords, setPositiveKeywords] = useState<string[]>([]);
  const [negativeKeywords, setNegativeKeywords] = useState<string[]>([]);
  const [newPositiveKeyword, setNewPositiveKeyword] = useState('');
  const [newNegativeKeyword, setNewNegativeKeyword] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchStats, setSearchStats] = useState<{ totalCount: number; searchTime: number } | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const positiveInputRef = useRef<HTMLInputElement>(null);
  const negativeInputRef = useRef<HTMLInputElement>(null);

  const handleAddPositiveKeyword = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ((e.type === 'keydown' && (e as React.KeyboardEvent).key === 'Enter') || e.type === 'click') {
      const keyword = newPositiveKeyword.trim();
      if (keyword && !positiveKeywords.includes(keyword)) {
        setPositiveKeywords([...positiveKeywords, keyword]);
        setNewPositiveKeyword('');
      }
    }
  };

  const handleAddNegativeKeyword = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ((e.type === 'keydown' && (e as React.KeyboardEvent).key === 'Enter') || e.type === 'click') {
      const keyword = newNegativeKeyword.trim();
      if (keyword && !negativeKeywords.includes(keyword)) {
        setNegativeKeywords([...negativeKeywords, keyword]);
        setNewNegativeKeyword('');
      }
    }
  };

  const removePositiveKeyword = (keywordToRemove: string) => {
    setPositiveKeywords(positiveKeywords.filter(k => k !== keywordToRemove));
  };

  const removeNegativeKeyword = (keywordToRemove: string) => {
    setNegativeKeywords(negativeKeywords.filter(k => k !== keywordToRemove));
  };

  const handleSearch = async () => {
    if (positiveKeywords.length === 0) {
      return;
    }

    setIsSearching(true);
    setSearchPerformed(false);
    
    try {
      const res = await apiRequest('POST', '/api/search/search', {
        positiveKeywords,
        negativeKeywords,
      });

      const response = await res.json() as { success: boolean; data: SearchResponse };

      if (response.success) {
        setSearchResults(response.data.results);
        setSearchStats({
          totalCount: response.data.totalCount,
          searchTime: response.data.searchTime,
        });
        setSearchPerformed(true);
        setSelectedCandidates([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleCandidateSelection = (candidateId: string) => {
    if (selectedCandidates.includes(candidateId)) {
      setSelectedCandidates(selectedCandidates.filter(id => id !== candidateId));
    } else {
      setSelectedCandidates([...selectedCandidates, candidateId]);
    }
  };

  const selectAllCandidates = () => {
    if (selectedCandidates.length === searchResults.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(searchResults.map(result => result.candidateId));
    }
  };

  const handleBulkAction = (action: 'email' | 'interview') => {
    if (selectedCandidates.length === 0) return;
    
    // TODO: Implement bulk actions
    console.log(`Bulk ${action} for candidates:`, selectedCandidates);
  };

  const canSearch = positiveKeywords.length > 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">חיפוש מתקדם בקורות חיים</h1>
        <p className="text-gray-600 dark:text-gray-400">
          חפש מועמדים לפי מילות מפתח חיוביות ושליליות בתוכן הקורות חיים
        </p>
      </div>

      {/* Search Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            פרמטרי חיפוש
          </CardTitle>
          <CardDescription>
            הגדר מילות מפתח לחיפוש בקורות החיים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Positive Keywords */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              מילות מפתח חיוביות (חייב להכיל)
            </label>
            <div className="flex gap-2 mb-3">
              <Input
                ref={positiveInputRef}
                value={newPositiveKeyword}
                onChange={(e) => setNewPositiveKeyword(e.target.value)}
                onKeyDown={handleAddPositiveKeyword}
                placeholder="הקלד מילת מפתח..."
                className="flex-1"
                data-testid="input-positive-keyword"
              />
              <Button
                onClick={handleAddPositiveKeyword}
                variant="outline"
                size="icon"
                data-testid="button-add-positive"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {positiveKeywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-3 py-1"
                  data-testid={`badge-positive-${keyword}`}
                >
                  {keyword}
                  <button
                    onClick={() => removePositiveKeyword(keyword)}
                    className="mr-1 hover:text-green-600"
                    data-testid={`button-remove-positive-${keyword}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Negative Keywords */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              מילות מפתח שליליות (אסור שיכיל)
            </label>
            <div className="flex gap-2 mb-3">
              <Input
                ref={negativeInputRef}
                value={newNegativeKeyword}
                onChange={(e) => setNewNegativeKeyword(e.target.value)}
                onKeyDown={handleAddNegativeKeyword}
                placeholder="הקלד מילת מפתח..."
                className="flex-1"
                data-testid="input-negative-keyword"
              />
              <Button
                onClick={handleAddNegativeKeyword}
                variant="outline"
                size="icon"
                data-testid="button-add-negative"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {negativeKeywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="secondary"
                  className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-3 py-1"
                  data-testid={`badge-negative-${keyword}`}
                >
                  {keyword}
                  <button
                    onClick={() => removeNegativeKeyword(keyword)}
                    className="mr-1 hover:text-red-600"
                    data-testid={`button-remove-negative-${keyword}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleSearch}
              disabled={!canSearch || isSearching}
              className="flex-1"
              data-testid="button-search"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Search className="h-4 w-4 ml-2" />
              )}
              {isSearching ? 'מחפש...' : 'חפש מועמדים'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchPerformed && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  תוצאות חיפוש
                </CardTitle>
                <CardDescription>
                  {searchStats && (
                    <div className="flex items-center gap-4 text-sm mt-1">
                      <span>נמצאו {searchStats.totalCount} מועמדים</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {searchStats.searchTime}ms
                      </span>
                    </div>
                  )}
                </CardDescription>
              </div>
              
              {/* Bulk Actions */}
              {selectedCandidates.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('email')}
                    data-testid="button-bulk-email"
                  >
                    <Mail className="h-4 w-4 ml-2" />
                    שלח מייל ({selectedCandidates.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('interview')}
                    data-testid="button-bulk-interview"
                  >
                    <Calendar className="h-4 w-4 ml-2" />
                    קבע ראיון ({selectedCandidates.length})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {searchResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                לא נמצאו מועמדים העונים לקריטריונים
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-right">
                        <Checkbox
                          checked={selectedCandidates.length === searchResults.length}
                          onCheckedChange={selectAllCandidates}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead className="text-right">שם</TableHead>
                      <TableHead className="text-right">עיר</TableHead>
                      <TableHead className="text-right">טלפון</TableHead>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">מילות מפתח</TableHead>
                      <TableHead className="text-right">תאריך עדכון</TableHead>
                      <TableHead className="w-20 text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((result) => (
                      <TableRow key={result.candidateId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCandidates.includes(result.candidateId)}
                            onCheckedChange={() => toggleCandidateSelection(result.candidateId)}
                            data-testid={`checkbox-candidate-${result.candidateId}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div>{result.firstName} {result.lastName}</div>
                            {result.cvPreview && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md truncate">
                                {result.cvPreview}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{result.city}</TableCell>
                        <TableCell>
                          <a href={`tel:${result.phone}`} className="text-blue-600 hover:underline">
                            {result.phone}
                          </a>
                        </TableCell>
                        <TableCell>
                          <a href={`mailto:${result.email}`} className="text-blue-600 hover:underline">
                            {result.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {result.matchedKeywords.map((keyword) => (
                              <Badge
                                key={keyword}
                                variant="outline"
                                className="text-xs"
                                data-testid={`badge-matched-${keyword}`}
                              >
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(result.extractedAt).toLocaleDateString('he-IL')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/candidates/${result.candidateId}`, '_blank')}
                            data-testid={`button-view-${result.candidateId}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}