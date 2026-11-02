// Stand-in for next/navigation in the offline preview: there is no app to navigate to
export function useRouter() {
  return { replace() {}, refresh() {} };
}
