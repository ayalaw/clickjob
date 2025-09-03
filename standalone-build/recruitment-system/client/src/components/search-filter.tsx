import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
}

interface SearchFilterProps {
  onFiltersChange?: (filters: Record<string, any>) => void;
  filterOptions?: {
    status?: FilterOption[];
    priority?: FilterOption[];
    type?: FilterOption[];
  };
}

export default function SearchFilter({ 
  onFiltersChange,
  filterOptions = {
    status: [
      { label: "פעיל", value: "active" },
      { label: "מושהה", value: "paused" },
      { label: "סגור", value: "closed" },
    ],
    priority: [
      { label: "גבוהה", value: "high" },
      { label: "בינונית", value: "medium" },
      { label: "נמוכה", value: "low" },
    ],
    type: [
      { label: "משרה מלאה", value: "full-time" },
      { label: "משרה חלקית", value: "part-time" },
      { label: "חוזה", value: "contract" },
    ],
  }
}: SearchFilterProps) {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: string, value: string | undefined) => {
    const newFilters = { ...filters };
    
    if (value && value !== "all") {
      newFilters[key] = value;
    } else {
      delete newFilters[key];
    }
    
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({});
    onFiltersChange?.({});
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const activeFilterCount = Object.keys(filters).length;

  const getFilterLabel = (key: string, value: string): string => {
    const options = filterOptions[key as keyof typeof filterOptions] || [];
    return options.find(option => option.value === value)?.label || value;
  };

  return (
    <div className="flex items-center space-x-2 space-x-reverse">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="relative"
            data-testid="button-open-filters"
          >
            <Filter className="h-4 w-4 ml-2" />
            מסננים
            {activeFilterCount > 0 && (
              <Badge 
                variant="secondary" 
                className="mr-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">סינון תוצאות</h4>
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  data-testid="button-clear-all-filters"
                >
                  נקה הכל
                </Button>
              )}
            </div>

            {filterOptions.status && (
              <div>
                <label className="text-sm font-medium mb-2 block">סטטוס</label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger data-testid="select-filter-status">
                    <SelectValue placeholder="כל הסטטוסים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    {filterOptions.status.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterOptions.priority && (
              <div>
                <label className="text-sm font-medium mb-2 block">עדיפות</label>
                <Select
                  value={filters.priority || "all"}
                  onValueChange={(value) => handleFilterChange("priority", value)}
                >
                  <SelectTrigger data-testid="select-filter-priority">
                    <SelectValue placeholder="כל העדיפויות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל העדיפויות</SelectItem>
                    {filterOptions.priority.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterOptions.type && (
              <div>
                <label className="text-sm font-medium mb-2 block">סוג</label>
                <Select
                  value={filters.type || "all"}
                  onValueChange={(value) => handleFilterChange("type", value)}
                >
                  <SelectTrigger data-testid="select-filter-type">
                    <SelectValue placeholder="כל הסוגים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסוגים</SelectItem>
                    {filterOptions.type.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={() => setIsOpen(false)}
                data-testid="button-close-filters"
              >
                סגור
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => (
            <Badge 
              key={key} 
              variant="secondary" 
              className="flex items-center gap-1"
              data-testid={`badge-active-filter-${key}`}
            >
              {getFilterLabel(key, value)}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => clearFilter(key)}
                data-testid={`button-clear-filter-${key}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
