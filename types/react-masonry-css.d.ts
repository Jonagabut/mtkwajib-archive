declare module "react-masonry-css" {
  import { ReactNode } from "react";
  interface MasonryProps {
    breakpointCols?: number | { [key: number]: number; default: number };
    className?: string;
    columnClassName?: string;
    children?: ReactNode;
  }
  export default function Masonry(props: MasonryProps): JSX.Element;
}
