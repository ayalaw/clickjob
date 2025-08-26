import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, FileText, Phone, MapPin } from 'lucide-react';
import type { Candidate } from '@shared/schema';

interface SearchResults {
  results: Candidate[];
}

export default function CVSearchPage() {
  const [searchKeywords, setSearchKeywords] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showCVModal, setShowCVModal] = useState(false);

  const { data: searchResults, isLoading, error } = useQuery<SearchResults>({
    queryKey: ['/api/candidates/search', searchQuery],
    enabled: !!searchQuery,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeywords.trim()) {
      setSearchQuery(searchKeywords.trim());
    }
  };

  const handleRowClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    if (candidate.cvPath) {
      setShowCVModal(true);
    }
  };

  const results = searchResults?.results || [];

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
              onChange={(e) => setSearchKeywords(e.target.value)}
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
              {results.length > 0 && (
                <span className="text-sm font-normal text-gray-600 mr-2">
                  ({results.length} תוצאות)
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