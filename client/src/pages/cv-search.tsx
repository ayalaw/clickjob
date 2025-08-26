import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, FileText, Phone, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { debounce } from 'lodash';
import type { Candidate } from '@shared/schema';

interface SearchResults {
  candidates: Candidate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function CVSearchPage() {
  const [searchKeywords, setSearchKeywords] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showCVModal, setShowCVModal] = useState(false);
  const pageSize = 100;

  // Debounced search to avoid too many API calls
  const debouncedSearch = useCallback(
    debounce((keywords: string) => {
      if (keywords.trim()) {
        setSearchQuery(keywords.trim());
        setCurrentPage(1); // Reset to first page on new search
      }
    }, 500),
    []
  );

  const { data: searchResults, isLoading, error } = useQuery<SearchResults>({
    queryKey: ['/api/candidates/search', searchQuery, currentPage],
    queryFn: async () => {
      const response = await fetch(
        `/api/candidates/search?keywords=${encodeURIComponent(searchQuery)}&page=${currentPage}&limit=${pageSize}`
      );
      if (!response.ok) {
        throw new Error('שגיאה בחיפוש');
      }
      return response.json();
    },
    enabled: !!searchQuery,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    debouncedSearch(searchKeywords);
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchKeywords(value);
    if (value.trim()) {
      debouncedSearch(value);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRowClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    if (candidate.cvPath) {
      setShowCVModal(true);
    }
  };

  const results = searchResults?.candidates || [];
  const total = searchResults?.total || 0;
  const totalPages = searchResults?.totalPages || 0;

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            חיפוש מילות מפתח בקורות חיים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              data-testid="input-keywords"
              type="text"
              placeholder="הכנס מילות מפתח לחיפוש בקורות החיים..."
              value={searchKeywords}
              onChange={handleKeywordChange}
              className="flex-1"
            />
            <Button 
              data-testid="button-search"
              type="submit" 
              disabled={!searchKeywords.trim() || isLoading}
            >
              <Search className="h-4 w-4 ml-2" />
              חפש
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">שגיאה בחיפוש: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">מחפש...</p>
          </CardContent>
        </Card>
      )}

      {searchQuery && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>
              תוצאות חיפוש עבור: "{searchQuery}"
              {total > 0 && (
                <span className="text-sm font-normal text-gray-600 mr-2">
                  ({total} תוצאות, עמוד {currentPage} מתוך {totalPages})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                לא נמצאו מועמדים עם מילות המפתח שחיפשת
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם מלא</TableHead>
                    <TableHead>טלפון</TableHead>
                    <TableHead>עיר</TableHead>
                    <TableHead>מקצוע</TableHead>
                    <TableHead>קורות חיים</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((candidate) => (
                    <TableRow
                      key={candidate.id}
                      data-testid={`row-candidate-${candidate.id}`}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRowClick(candidate)}
                    >
                      <TableCell className="font-medium">
                        {candidate.firstName} {candidate.lastName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {candidate.mobile || candidate.phone || 'לא צוין'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {candidate.city || 'לא צוין'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {candidate.profession || 'לא צוין'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {candidate.cvPath ? 'קיים' : 'לא קיים'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  data-testid="button-prev-page"
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1"
                >
                  <ChevronRight className="h-4 w-4" />
                  הקודם
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = Math.max(1, currentPage - 2) + i;
                    if (pageNumber > totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNumber}
                        data-testid={`button-page-${pageNumber}`}
                        variant={currentPage === pageNumber ? 'default' : 'outline'}
                        onClick={() => handlePageChange(pageNumber)}
                        className="w-10 h-10"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  data-testid="button-next-page"
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1"
                >
                  הבא
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CV Viewer Modal */}
      <Dialog open={showCVModal} onOpenChange={setShowCVModal}>
        <DialogContent className="max-w-4xl h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              קורות חיים - {selectedCandidate?.firstName} {selectedCandidate?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedCandidate?.cvPath ? (
              <iframe
                data-testid="iframe-cv-viewer"
                src={`/uploads/${selectedCandidate.cvPath}`}
                className="w-full h-full border rounded"
                title="קורות חיים"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>לא נמצא קובץ קורות חיים</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}